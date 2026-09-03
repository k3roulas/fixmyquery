import { describe, expect, it } from 'vitest';

import { runDeterministicAnalysis } from './analyzer';
import { parseExplain } from './parser';
import { SAMPLES } from './samples';
import type { PlanNode } from './types';

const BUFFER_KEYS = [
  'sharedHitBlocks',
  'sharedReadBlocks',
  'tempReadBlocks',
  'tempWrittenBlocks',
] as const;

function childBufferSum(node: PlanNode, key: (typeof BUFFER_KEYS)[number]): number {
  return node.children.reduce((acc, c) => acc + (c[key] ?? 0), 0);
}

describe('sample arithmetic coherence', () => {
  for (const sample of SAMPLES) {
    for (const [format, input] of [
      ['json', sample.explainJson],
      ['text', sample.explainText],
    ] as const) {
      it(`${sample.id} (${format}): parents cover children, buffers accumulate upward`, () => {
        const { root } = parseExplain(input);

        const visit = (node: PlanNode): void => {
          const childTime = node.children.reduce((acc, c) => acc + (c.inclusiveMs ?? 0), 0);
          expect(node.inclusiveMs ?? 0).toBeGreaterThanOrEqual(childTime - 1);
          for (const key of BUFFER_KEYS) {
            expect(node[key] ?? 0).toBeGreaterThanOrEqual(childBufferSum(node, key));
          }
          node.children.forEach(visit);
        };
        visit(root);
      });

      it(`${sample.id} (${format}): root time matches execution time`, () => {
        const { root, totals } = parseExplain(input);
        expect(root.inclusiveMs ?? 0).toBeLessThanOrEqual(totals.executionMs + 2);
        expect(totals.executionMs - (root.inclusiveMs ?? 0)).toBeLessThanOrEqual(50);
      });

      it(`${sample.id} (${format}): disk sort's own temp writes match its reported space`, () => {
        const { root } = parseExplain(input);
        const visit = (node: PlanNode): void => {
          if (node.nodeType === 'Sort' && node.sortSpaceType === 'Disk') {
            const ownTempWrittenKb =
              ((node.tempWrittenBlocks ?? 0) - childBufferSum(node, 'tempWrittenBlocks')) * 8;
            expect(Math.abs(ownTempWrittenKb - (node.sortSpaceUsedKb ?? 0))).toBeLessThanOrEqual(
              (node.sortSpaceUsedKb ?? 0) * 0.02
            );
          }
          node.children.forEach(visit);
        };
        visit(root);
      });
    }

    it(`${sample.id}: both formats agree on totals`, () => {
      const json = parseExplain(sample.explainJson).totals;
      const text = parseExplain(sample.explainText).totals;
      expect(text.executionMs).toBeCloseTo(json.executionMs, 3);
      expect(text.nodeCount).toBe(json.nodeCount);
      for (const key of BUFFER_KEYS) {
        expect(text[key]).toBe(json[key]);
      }
    });
  }
});

describe('samples sanity', () => {
  for (const sample of SAMPLES) {
    it(`${sample.id}: parses in both formats and yields findings`, () => {
      const jsonPlan = parseExplain(sample.explainJson);
      expect(jsonPlan.format).toBe('json');
      const textPlan = parseExplain(sample.explainText);
      expect(textPlan.format).toBe('text');

      const jsonFindings = runDeterministicAnalysis(jsonPlan, sample.sql);
      expect(jsonFindings.length).toBeGreaterThan(0);

      const textFindings = runDeterministicAnalysis(textPlan, sample.sql);
      expect(textFindings.length).toBeGreaterThan(0);

      const jsonRules = new Set(jsonFindings.map((f) => f.ruleId));
      const textRules = new Set(textFindings.map((f) => f.ruleId));
      expect(jsonRules).toEqual(textRules);
    });
  }

  it('covers the five seeded scenarios', () => {
    expect(SAMPLES.map((s) => s.id)).toEqual([
      'missing-index',
      'leading-wildcard-like',
      'offset-pagination',
      'join-cardinality-explosion',
      'sort-hash-spill',
    ]);
  });
});
