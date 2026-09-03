import { describe, expect, it } from 'vitest';

import { parseExplainJson } from './explainJson';

const PLAN = JSON.stringify([
  {
    Plan: {
      'Node Type': 'Limit',
      'Actual Total Time': 380.124,
      'Actual Rows': 20,
      'Actual Loops': 1,
      Plans: [
        {
          'Node Type': 'Seq Scan',
          'Relation Name': 'orders',
          Alias: 'o',
          'Plan Rows': 400,
          'Actual Total Time': 379.742,
          'Actual Rows': 500,
          'Actual Loops': 1,
          Filter: '(customer_id = 42)',
          'Rows Removed by Filter': 499500,
          'Shared Hit Blocks': 100,
          'Shared Read Blocks': 200,
        },
      ],
    },
    'Planning Time': 0.231,
    'Execution Time': 380.221,
  },
]);

describe('parseExplainJson', () => {
  it('normalizes nested plans into PlanNode tree', () => {
    const { root, executionMs, planningMs } = parseExplainJson(PLAN);
    expect(root.nodeType).toBe('Limit');
    expect(executionMs).toBeCloseTo(380.221, 3);
    expect(planningMs).toBeCloseTo(0.231, 3);

    const scan = root.children[0];
    expect(scan?.nodeType).toBe('Seq Scan');
    expect(scan?.relation).toBe('orders');
    expect(scan?.alias).toBe('o');
    expect(scan?.estRows).toBe(400);
    expect(scan?.actualRows).toBe(500);
    expect(scan?.filter).toBe('(customer_id = 42)');
    expect(scan?.rowsRemovedByFilter).toBe(499500);
    expect(scan?.sharedHitBlocks).toBe(100);
    expect(scan?.sharedReadBlocks).toBe(200);
  });

  it('handles absent optional fields', () => {
    const minimal = JSON.stringify([{ Plan: { 'Node Type': 'Result' } }]);
    const { root } = parseExplainJson(minimal);
    expect(root.nodeType).toBe('Result');
    expect(root.children).toHaveLength(0);
    expect(root.filter).toBeUndefined();
    expect(root.estRows).toBe(0);
  });

  it('accepts a bare object without array wrapper', () => {
    const bare = JSON.stringify({ Plan: { 'Node Type': 'Result' }, 'Execution Time': 1 });
    const { root } = parseExplainJson(bare);
    expect(root.nodeType).toBe('Result');
  });

  it('throws on JSON without a Plan', () => {
    expect(() => parseExplainJson('{"foo": 1}')).toThrow();
  });
});
