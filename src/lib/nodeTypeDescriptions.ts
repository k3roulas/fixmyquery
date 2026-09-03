// Plain-English descriptions of PostgreSQL plan node types, shown in NodeDetailPanel.
// Grounded in the PostgreSQL docs "Using EXPLAIN" chapter
// (postgresql.org/docs/current/using-explain.html) and Crunchy Data's scan-types guide
// (crunchydata.com/blog/postgres-scan-types-in-explain-plans).
const NODE_TYPE_DESCRIPTIONS: Record<string, string> = {
  // Scans
  'Seq Scan':
    'Reads every row of the table in physical order, applying any filter as it goes. Fine for small tables or when a large share of rows matches; on a big table with a selective WHERE it is the classic missing-index signal.',
  'Index Scan':
    'Walks an index (usually a B-tree) to find matching entries, then fetches each full row from the table. Great for selective queries and for ORDER BY that matches the index order; degrades into random I/O once a large fraction of the table matches (~10% or more).',
  'Index Only Scan':
    'Answers the query from the index alone without visiting the table — the covering-index best case. It requires every referenced column in the index and a well-vacuumed visibility map; non-zero Heap Fetches mean it still had to touch the table.',
  'Index Scan Backward':
    'An index scan reading the B-tree in reverse, typically to satisfy ORDER BY … DESC without an explicit sort.',
  'Bitmap Index Scan':
    'Reads one index and builds an in-memory bitmap of the table pages that might contain matching rows. It returns no rows itself — it always feeds a Bitmap Heap Scan parent.',
  'Bitmap Heap Scan':
    'Visits the table pages chosen by its Bitmap Index Scan child(ren) in physical order, then rechecks the conditions on each row. A middle ground: more selective than a seq scan, less random I/O than many index scans, and it can combine several indexes (via BitmapAnd / BitmapOr).',
  BitmapAnd:
    'Intersects the bitmaps of several index scans so an AND of conditions across different indexes prunes pages before the heap is touched.',
  BitmapOr:
    'Unions the bitmaps of several index scans so an OR of conditions across different indexes can be served together before the heap is touched.',
  'Tid Scan':
    'Fetches rows directly by physical address (ctid) — e.g. WHERE ctid = … queries or internal row-movement rechecks. Bypasses all indexes.',
  'Function Scan':
    'Produces rows by calling a set-returning function in FROM, such as generate_series(). Cost depends entirely on how expensive the function is per row.',
  'Values Scan': 'Reads rows from an inline VALUES list — nothing is fetched from disk.',
  'CTE Scan':
    'Reads the computed result of a CTE (WITH clause). Since PostgreSQL 12 CTEs are usually inlined into the outer query; a MATERIALIZED one is computed once up front and read back here.',
  'Subquery Scan':
    'Passes through the output of an unnamed subquery in FROM, applying that scope’s filters.',
  'Foreign Scan':
    'Fetches rows from an external source through a foreign data wrapper — the remote query’s plan and network latency dominate the cost.',
  'Sample Scan': 'Scans a random TABLESAMPLE subset of the table.',
  'Custom Scan': 'A scan provided by an extension; consult that extension’s documentation.',

  // Joins
  'Nested Loop':
    'For each row of the outer child, executes the inner child once — so the inner side’s loops equal the outer row count. Excellent when the outer side is small and the inner side is indexed; it explodes when the outer side is large or the inner has no index, which is when loops climb into the thousands.',
  'Hash Join':
    'Builds an in-memory hash table from the (usually smaller) build input, then scans the other input and probes it for each row. The workhorse for large unsorted inputs; when it exceeds work_mem it splits into batches written to temp files (Batches > 1).',
  'Merge Join':
    'Merges two inputs already sorted on the join keys in one synchronized pass. Very efficient for large sorted inputs (often index-provided order); otherwise each side needs an explicit Sort underneath, and those sorts’ cost belongs to this join.',

  // Sorts
  Sort: 'Sorts its input on the sort key(s): quicksort in memory up to work_mem, then an external merge on disk. "external merge … Disk: NkB" means it spilled — raise work_mem, feed it fewer rows, or provide an index that already yields the order.',
  'Incremental Sort':
    'Exploits input already sorted on a prefix of the sort keys and only sorts the remaining keys in small batches — cheaper than a full sort, uses less memory, and can emit rows early (which pairs well with LIMIT).',

  // Aggregation
  Aggregate:
    'Computes aggregate functions (COUNT, SUM, …). Hashed strategy builds a hash table keyed by the GROUP BY columns; Sorted/Plain strategy aggregates on the fly over ordered input — the Strategy field on the node says which.',
  HashAggregate:
    'Aggregate using a hash table keyed by the GROUP BY columns — no input ordering needed, but the table must fit in work_mem or it spills to batches.',
  GroupAggregate:
    'Aggregate over input ordered by the GROUP BY keys, accumulating one group at a time — cheap memory, but it relies on (or adds) a sort.',

  // Hash build
  Hash: 'Builds the hash table its parent Hash Join (or HashAggregate) will probe — its time and memory belong to that parent. Batches > 1 means the table exceeded work_mem and spilled to temp files.',

  // Row-limit and set operations
  Limit:
    'Stops reading its child as soon as the LIMIT row count is reached (after skipping OFFSET rows), so children never run to completion. A large OFFSET still forces all skipped rows to be produced and thrown away — keyset pagination avoids that.',
  Unique:
    'Discards adjacent duplicate rows from sorted input — used for DISTINCT in some plans and for INTERSECT/EXCEPT.',
  SetOp: 'Computes INTERSECT or EXCEPT over its sorted inputs, deduplicating rows as it goes.',

  // Parallelism
  Gather:
    'Collects rows from parallel worker processes into the leader — the sign that the plan below it ran in parallel (compare Workers Planned vs Workers Launched).',
  'Gather Merge':
    'Like Gather, but merges each worker’s already-sorted output into one globally ordered stream, for parallel plans that must preserve ORDER BY.',

  // Partitioning / combination
  Append:
    'Runs all its children and concatenates the results — used for UNION ALL, inheritance tables, and partitioned tables (where runtime pruning may skip partitions).',
  'Merge Append':
    'Concatenates children that are each sorted on the same key while keeping the result globally sorted — typical over partitions with aligned indexes.',

  // Misc upper nodes
  Result:
    'Computes rows without scanning anything (e.g. SELECT 1+1) or applies a one-time filter evaluated once before execution starts.',
  WindowAgg:
    'Computes window functions (OVER …) over its input; the input must already be sorted/partitioned to match each window’s PARTITION BY / ORDER BY.',
  Materialize:
    'Buffers its child’s output in memory (spilling to temp if large) so a Nested Loop above can re-read it cheaply instead of re-executing the child per outer row.',
  Memoize:
    'Caches an inner side’s results keyed by the join parameters so repeated Nested Loop probes with the same outer values skip the underlying scan — check its Hits vs Misses counters.',
  ModifyTable:
    'Performs the actual INSERT / UPDATE / DELETE / MERGE writes; its children only produce the rows to be written.',
  'Lock Rows': 'Takes row locks (FOR UPDATE / FOR SHARE) on the rows its child produced.',
  'Recursive Union':
    'Drives a recursive CTE: runs the seed term, then feeds each round’s output back into the recursive term until a round produces no rows. Its two children are those two terms.',
  'WorkTable Scan':
    'Reads the previous round’s results of a recursive CTE — always appears under a Recursive Union.',
  'Named Tuplestore Scan':
    'Reads a named intermediate result, e.g. the transition table visible to AFTER … FOR EACH ROW triggers.',
  'Table Function Scan': 'Reads rows from an XML-style table function in FROM.',
};

const FALLBACKS: [RegExp, string][] = [
  [
    /Scan/,
    'A scan node produces rows from a table or another row source; filter conditions shown on it are applied as rows flow through.',
  ],
  [
    /Join/,
    'A join node combines rows from its two children according to its join condition; the strategy (nested loop, hash, or merge) decides how the sides get matched.',
  ],
  [
    /Sort/,
    'A sorting node puts its input rows in order — watch its memory usage versus disk spill.',
  ],
  [
    /Aggregat/,
    'An aggregation node collapses groups of input rows into summary values (COUNT, SUM, …).',
  ],
];

export function describeNodeType(nodeType: string): string {
  const exact = NODE_TYPE_DESCRIPTIONS[nodeType];
  if (exact) return exact;
  for (const [pattern, text] of FALLBACKS) {
    if (pattern.test(nodeType)) return text;
  }
  return 'No curated description for this node type yet — the PostgreSQL docs chapter “Using EXPLAIN” (postgresql.org/docs/current/using-explain.html) is the authoritative reference for reading plans.';
}
