import { describe, expect, it } from 'vitest';

import { parseExplain } from '../../parser';
import type { PlanNode, PlanTotals } from '../../types';
import { computeTotals } from '../metrics';
import { cardinalityMismatch } from './cardinalityMismatch';
import { hashSpillToDisk } from './hashSpillToDisk';
import { largeOffset } from './largeOffset';
import { nestedLoopHighLoops } from './nestedLoopHighLoops';
import { nonSargableFilter } from './nonSargableFilter';
import { seqScanOnLargeTable } from './seqScanOnLargeTable';
import { sortSpillToDisk } from './sortSpillToDisk';

function node(over: Partial<PlanNode>): PlanNode {
  return {
    id: 'n0',
    nodeType: 'Seq Scan',
    actualLoops: 1,
    actualTimeMs: 100,
    estRows: 100,
    actualRows: 100,
    inclusiveMs: 100,
    timeSharePct: 100,
    children: [],
    ...over,
  };
}

function totalsFor(root: PlanNode, executionMs = 100): PlanTotals {
  return computeTotals(root, 0, executionMs);
}

describe('seqScanOnLargeTable', () => {
  it('flags big filtered seq scans', () => {
    const root = node({ rowsRemovedByFilter: 499_500, actualRows: 500 });
    const findings = seqScanOnLargeTable(root, totalsFor(root));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('high');
    expect(findings[0]?.ruleId).toBe('seq-scan-large-table');
  });

  it('ignores small tables', () => {
    const root = node({ rowsRemovedByFilter: 500, actualRows: 50 });
    expect(seqScanOnLargeTable(root, totalsFor(root))).toHaveLength(0);
  });

  it('ignores index scans', () => {
    const root = node({ nodeType: 'Index Scan', rowsRemovedByFilter: 500_000 });
    expect(seqScanOnLargeTable(root, totalsFor(root))).toHaveLength(0);
  });
});

describe('cardinalityMismatch', () => {
  it('flags underestimates over 100x', () => {
    const root = node({ estRows: 200, actualRows: 40_000 });
    const findings = cardinalityMismatch(root, totalsFor(root));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('high');
  });

  it('flags overestimates when actual is tiny', () => {
    const root = node({ estRows: 500_000, actualRows: 10 });
    expect(cardinalityMismatch(root, totalsFor(root))).toHaveLength(1);
  });

  it('accepts estimates within 100x', () => {
    const root = node({ estRows: 1_000, actualRows: 40_000 });
    expect(cardinalityMismatch(root, totalsFor(root))).toHaveLength(0);
  });
});

describe('nestedLoopHighLoops', () => {
  it('flags inner side re-executed many times at significant cost', () => {
    const inner = node({
      id: 'n1',
      nodeType: 'Index Scan',
      actualLoops: 40_000,
      actualTimeMs: 0.078,
    });
    const outer = node({ id: 'n0', nodeType: 'Nested Loop', children: [inner] });
    const totals = totalsFor(outer, 5_000);
    inner.timeSharePct = 62;
    const findings = nestedLoopHighLoops(outer, totals);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.nodeId).toBe('n0');
  });

  it('ignores nested loops with few repetitions', () => {
    const inner = node({ id: 'n1', actualLoops: 20 });
    const outer = node({ id: 'n0', nodeType: 'Nested Loop', children: [inner] });
    expect(nestedLoopHighLoops(outer, totalsFor(outer))).toHaveLength(0);
  });
});

describe('sortSpillToDisk', () => {
  it('flags external merge over 10MB as high', () => {
    const root = node({
      nodeType: 'Sort',
      sortMethod: 'external merge',
      sortSpaceUsedKb: 24_188,
      sortSpaceType: 'Disk',
    });
    const findings = sortSpillToDisk(root, totalsFor(root));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('high');
  });

  it('flags small spills as medium and ignores in-memory sorts', () => {
    const small = node({ nodeType: 'Sort', sortMethod: 'external merge', sortSpaceUsedKb: 900 });
    expect(sortSpillToDisk(small, totalsFor(small))[0]?.severity).toBe('medium');

    const memory = node({ nodeType: 'Sort', sortMethod: 'quicksort', sortSpaceType: 'Memory' });
    expect(sortSpillToDisk(memory, totalsFor(memory))).toHaveLength(0);
  });
});

describe('hashSpillToDisk', () => {
  it('flags hashed batches over 1', () => {
    const root = node({ nodeType: 'Hash', hashBatches: 64, hashBuckets: 262_144 });
    const findings = hashSpillToDisk(root, totalsFor(root));
    expect(findings).toHaveLength(1);
  });

  it('ignores single-batch hashes and non-hash nodes', () => {
    const ok = node({ nodeType: 'Hash', hashBatches: 1 });
    expect(hashSpillToDisk(ok, totalsFor(ok))).toHaveLength(0);
    const notHash = node({ nodeType: 'Sort', hashBatches: 8 });
    expect(hashSpillToDisk(notHash, totalsFor(notHash))).toHaveLength(0);
  });
});

describe('nonSargableFilter', () => {
  it.each([
    "((name ~~ '%phone%'::text) AND (active = true))",
    "(name LIKE '%phone%')",
    '(lower(email) = $1)',
    "(date_trunc('day', created_at) = '2026-01-01'::date)",
  ])('flags %s', (predicate) => {
    const root = node({ filter: predicate });
    expect(nonSargableFilter(root, totalsFor(root))).toHaveLength(1);
  });

  it('passes sargable predicates', () => {
    const root = node({ filter: '(customer_id = 42)' });
    expect(nonSargableFilter(root, totalsFor(root))).toHaveLength(0);
  });
});

describe('largeOffset', () => {
  it('flags OFFSET >= 10000', () => {
    const findings = largeOffset('SELECT * FROM t ORDER BY x LIMIT 50 OFFSET 50000');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('large-offset');
  });

  it('passes small offsets and no offset', () => {
    expect(largeOffset('SELECT * FROM t OFFSET 20')).toHaveLength(0);
    expect(largeOffset('SELECT * FROM t')).toHaveLength(0);
  });
});

describe('end-to-end via runDeterministicAnalysis', () => {
  it('is importable and sorts by severity', async () => {
    const { runDeterministicAnalysis } = await import('../index');
    const { SAMPLES } = await import('../../samples');
    const sample = SAMPLES.find((s) => s.id === 'offset-pagination');
    if (!sample) throw new Error('sample missing');
    const plan = parseExplain(sample.explainJson);
    const findings = runDeterministicAnalysis(plan, sample.sql);
    const ruleIds = new Set(findings.map((f) => f.ruleId));
    expect(ruleIds.has('sort-spill-to-disk')).toBe(true);
    expect(ruleIds.has('large-offset')).toBe(true);
    expect(findings[0]?.severity).toBe('high');
  });
});
