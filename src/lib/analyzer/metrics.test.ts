import { describe, expect, it } from 'vitest';

import type { PlanNode } from '../types';
import { computeMetrics, computeTotals, walk } from './metrics';

function node(over: Partial<PlanNode>): PlanNode {
  return {
    id: 'n0',
    nodeType: 'Seq Scan',
    actualLoops: 1,
    actualTimeMs: 0,
    estRows: 0,
    actualRows: 0,
    inclusiveMs: 0,
    timeSharePct: 0,
    children: [],
    ...over,
  };
}

describe('metrics', () => {
  it('computes totals across the whole tree', () => {
    const root = node({
      id: 'n0',
      actualTimeMs: 100,
      sharedHitBlocks: 10,
      children: [
        node({ id: 'n1', actualTimeMs: 60, sharedHitBlocks: 5, sharedReadBlocks: 7, children: [] }),
        node({ id: 'n2', actualTimeMs: 40, tempWrittenBlocks: 3, children: [] }),
      ],
    });
    const totals = computeTotals(root, 1, 100);
    expect(totals.nodeCount).toBe(3);
    expect(totals.executionMs).toBe(100);
    expect(totals.sharedHitBlocks).toBe(15);
    expect(totals.sharedReadBlocks).toBe(7);
    expect(totals.tempWrittenBlocks).toBe(3);
  });

  it('multiplies time by loops and clamps share at 100%', () => {
    const root = node({
      id: 'n0',
      actualTimeMs: 100,
      children: [node({ id: 'n1', actualTimeMs: 2, actualLoops: 500 })],
    });
    const totals = computeTotals(root, 0, 100);
    computeMetrics(root, totals);
    const inner = root.children[0];
    expect(inner?.inclusiveMs).toBe(1000);
    expect(inner?.timeSharePct).toBe(100);
  });

  it('walks every node exactly once', () => {
    const root = node({
      id: 'n0',
      children: [node({ id: 'n1', children: [node({ id: 'n2' })] }), node({ id: 'n3' })],
    });
    const ids = Array.from(walk(root)).map((n) => n.id);
    expect(ids).toEqual(['n0', 'n1', 'n2', 'n3']);
  });
});
