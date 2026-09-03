import { describe, expect, it } from 'vitest';
import { parseExplainText } from '@/lib/parser/explainText';

const PLAN = `Limit  (cost=100.01..100.01 rows=20 width=44) (actual time=379.816..380.124 rows=20 loops=1)
  ->  Sort  (cost=100.00..100.01 rows=500 width=44) (actual time=379.804..379.912 rows=500 loops=1)
        Sort Key: created_at DESC
        Sort Method: top-N heapsort  Memory: 31kB
        Buffers: shared hit=24692 read=8152
        ->  Seq Scan on orders  (cost=0.00..99.00 rows=400 width=44) (actual time=0.041..379.742 rows=500 loops=1)
              Filter: (customer_id = 42)
              Rows Removed by Filter: 499500
              Buffers: shared hit=24692 read=8152
Planning Time: 0.231 ms
Execution Time: 380.221 ms`;

describe('parseExplainText', () => {
  it('builds the tree with correct parent/child structure', () => {
    const { root } = parseExplainText(PLAN);
    expect(root.nodeType).toBe('Limit');
    const sort = root.children[0];
    expect(sort?.nodeType).toBe('Sort');
    const scan = sort?.children[0];
    expect(scan?.nodeType).toBe('Seq Scan');
    expect(scan?.relation).toBe('orders');
    expect(scan?.children).toHaveLength(0);
  });

  it('attaches attributes to the owning node', () => {
    const { root } = parseExplainText(PLAN);
    const sort = root.children[0];
    expect(sort?.sortKey).toBe('created_at DESC');
    expect(sort?.sortMethod).toBe('top-N heapsort');
    expect(sort?.sortSpaceUsedKb).toBe(31);
    expect(sort?.sortSpaceType).toBe('memory');
    expect(sort?.sharedHitBlocks).toBe(24692);

    const scan = sort?.children[0];
    expect(scan?.filter).toBe('(customer_id = 42)');
    expect(scan?.rowsRemovedByFilter).toBe(499500);
  });

  it('parses rows, loops and actual time', () => {
    const { root, executionMs } = parseExplainText(PLAN);
    const scan = root.children[0]?.children[0];
    expect(scan?.estRows).toBe(400);
    expect(scan?.actualRows).toBe(500);
    expect(scan?.actualLoops).toBe(1);
    expect(scan?.actualTimeMs).toBeCloseTo(379.742, 3);
    expect(executionMs).toBeCloseTo(380.221, 3);
  });

  it('parses external merge disk sorts', () => {
    const spill = `Sort  (cost=1.00..2.00 rows=1000 width=10) (actual time=5.0..6.0 rows=1000 loops=1)
      Sort Method: external merge  Disk: 24188kB
      Buffers: shared hit=10 read=20, temp read=5 written=6
Execution Time: 6.5 ms`;
    const { root } = parseExplainText(spill);
    expect(root.sortMethod).toBe('external merge');
    expect(root.sortSpaceType).toBe('disk');
    expect(root.sortSpaceUsedKb).toBe(24188);
    expect(root.tempReadBlocks).toBe(5);
    expect(root.tempWrittenBlocks).toBe(6);
  });

  it('parses index scans with using/on and hash batches', () => {
    const plan = `Hash Join  (cost=1.00..2.00 rows=10 width=5) (actual time=1.0..2.0 rows=10 loops=1)
      Hash Cond: (a.id = b.aid)
  ->  Index Scan using idx_a on orders o  (cost=0.43..1.00 rows=2 width=4) (actual time=0.01..0.02 rows=2 loops=5)
        Index Cond: (order_id = 1)
  ->  Hash  (cost=1.00..1.00 rows=100 width=4) (actual time=0.5..0.5 rows=100 loops=1)
        Buckets: 1024  Batches: 8  Memory Usage: 4096kB
Execution Time: 2.5 ms`;
    const { root } = parseExplainText(plan);
    const scan = root.children[0];
    expect(scan?.nodeType).toBe('Index Scan');
    expect(scan?.indexName).toBe('idx_a');
    expect(scan?.relation).toBe('orders');
    expect(scan?.alias).toBe('o');
    expect(scan?.filter).toBe('(order_id = 1)');

    const hash = root.children[1];
    expect(hash?.nodeType).toBe('Hash');
    expect(hash?.hashBatches).toBe(8);
    expect(hash?.hashBuckets).toBe(1024);
  });

  it('tolerates plans without actual times (plain EXPLAIN)', () => {
    const plain = `Seq Scan on orders  (cost=0.00..99.00 rows=400 width=44)`;
    const { root } = parseExplainText(plain);
    expect(root.nodeType).toBe('Seq Scan');
    expect(root.actualRows).toBe(0);
    expect(root.actualLoops).toBe(1);
  });

  it('throws on non-plan input', () => {
    expect(() => parseExplainText('hello world\nnothing here')).toThrow();
  });
});
