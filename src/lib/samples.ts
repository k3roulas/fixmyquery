export interface Sample {
  id: string;
  title: string;
  blurb: string;
  ddl: string;
  sql: string;
  explainJson: string;
  explainText: string;
  /** Which EXPLAIN flavor loadSample pastes into the textarea. Default: JSON. */
  format?: 'json' | 'text';
}

const missingIndex: Sample = {
  id: 'missing-index',
  title: 'Missing index on orders.customer_id',
  blurb:
    '500k-row orders table scanned end-to-end to serve a single-customer lookup. Classic missing-index shape.',
  ddl: `CREATE TABLE orders (
  id            bigserial PRIMARY KEY,
  customer_id   bigint NOT NULL,
  status        text NOT NULL,
  total_amount  numeric(10,2),
  created_at    timestamptz NOT NULL
);
-- ~500,000 rows, no index on customer_id`,
  sql: 'SELECT id, status, total_amount, created_at\nFROM orders\nWHERE customer_id = 42\nORDER BY created_at DESC\nLIMIT 20;',
  explainJson: JSON.stringify([
    {
      Plan: {
        'Node Type': 'Limit',
        'Startup Cost': 134245.01,
        'Total Cost': 134245.01,
        'Plan Rows': 20,
        'Plan Width': 44,
        'Actual Startup Time': 379.816,
        'Actual Total Time': 380.124,
        'Actual Rows': 20,
        'Actual Loops': 1,
        'Shared Hit Blocks': 24740,
        'Shared Read Blocks': 8154,
        Plans: [
          {
            'Node Type': 'Sort',
            'Parent Relationship': 'Outer',
            'Startup Cost': 134245.0,
            'Total Cost': 134245.01,
            'Plan Rows': 500,
            'Plan Width': 44,
            'Actual Startup Time': 379.804,
            'Actual Total Time': 379.912,
            'Actual Rows': 500,
            'Actual Loops': 1,
            'Sort Key': ['created_at DESC'],
            'Sort Method': 'top-N heapsort',
            'Sort Space Used': 31,
            'Sort Space Type': 'Memory',
            'Shared Hit Blocks': 24692,
            'Shared Read Blocks': 8152,
            Plans: [
              {
                'Node Type': 'Seq Scan',
                'Parent Relationship': 'Outer',
                'Relation Name': 'orders',
                Alias: 'orders',
                'Startup Cost': 0.0,
                'Total Cost': 134233.0,
                'Plan Rows': 400,
                'Plan Width': 44,
                'Actual Startup Time': 0.041,
                'Actual Total Time': 379.742,
                'Actual Rows': 500,
                'Actual Loops': 1,
                Filter: '(customer_id = 42)',
                'Rows Removed by Filter': 499500,
                'Shared Hit Blocks': 24692,
                'Shared Read Blocks': 8152,
              },
            ],
          },
        ],
      },
      'Planning Time': 0.231,
      Triggers: [],
      'Execution Time': 380.221,
    },
  ]),
  explainText: `Limit  (cost=134245.01..134245.01 rows=20 width=44) (actual time=379.816..380.124 rows=20 loops=1)
      Buffers: shared hit=24740 read=8154
  ->  Sort  (cost=134245.00..134245.01 rows=500 width=44) (actual time=379.804..379.912 rows=500 loops=1)
        Sort Key: created_at DESC
        Sort Method: top-N heapsort  Memory: 31kB
        Buffers: shared hit=24692 read=8152
        ->  Seq Scan on orders  (cost=0.00..134233.00 rows=400 width=44) (actual time=0.041..379.742 rows=500 loops=1)
              Filter: (customer_id = 42)
              Rows Removed by Filter: 499500
              Buffers: shared hit=24692 read=8152
Planning Time: 0.231 ms
Execution Time: 380.221 ms`,
};

const BASE_SAMPLES: Sample[] = [
  {
    id: 'leading-wildcard-like',
    title: 'Leading-wildcard LIKE on products.name',
    blurb:
      "Substring search with LIKE '%phone%' cannot use a B-tree index — full scan of 200k products, ~610ms.",
    ddl: `CREATE TABLE products (
  id       bigserial PRIMARY KEY,
  name     text NOT NULL,
  active   boolean NOT NULL DEFAULT true,
  price    numeric(10,2)
);
-- ~200,000 rows`,
    sql: "SELECT id, name, price\nFROM products\nWHERE name LIKE '%phone%' AND active = true;",
    explainJson: JSON.stringify([
      {
        Plan: {
          'Node Type': 'Seq Scan',
          'Relation Name': 'products',
          Alias: 'products',
          'Startup Cost': 0.0,
          'Total Cost': 5241.0,
          'Plan Rows': 1400,
          'Plan Width': 68,
          'Actual Startup Time': 0.045,
          'Actual Total Time': 610.354,
          'Actual Rows': 1408,
          'Actual Loops': 1,
          Filter: "((name ~~ '%phone%'::text) AND (active = true))",
          'Rows Removed by Filter': 198592,
          'Shared Hit Blocks': 132,
          'Shared Read Blocks': 4256,
        },
        'Planning Time': 0.182,
        Triggers: [],
        'Execution Time': 610.512,
      },
    ]),
    explainText: `Seq Scan on products  (cost=0.00..5241.00 rows=1400 width=68) (actual time=0.045..610.354 rows=1408 loops=1)
      Filter: ((name ~~ '%phone%'::text) AND (active = true))
      Rows Removed by Filter: 198592
      Buffers: shared hit=132 read=4256
Planning Time: 0.182 ms
Execution Time: 610.512 ms`,
  },
  {
    id: 'offset-pagination',
    title: 'OFFSET pagination on events',
    blurb:
      'Deep OFFSET pagination sorts 1M rows and spills to disk (24MB) just to discard the first 50,000.',
    ddl: `CREATE TABLE events (
  id          bigserial PRIMARY KEY,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL
);
-- ~1,000,000 rows, no index on created_at`,
    sql: 'SELECT id, payload, created_at\nFROM events\nORDER BY created_at DESC\nLIMIT 50 OFFSET 50000;',
    explainJson: JSON.stringify([
      {
        Plan: {
          'Node Type': 'Limit',
          'Startup Cost': 178026.06,
          'Total Cost': 178028.31,
          'Plan Rows': 50,
          'Plan Width': 120,
          'Actual Startup Time': 2384.012,
          'Actual Total Time': 2384.164,
          'Actual Rows': 50,
          'Actual Loops': 1,
          'Shared Hit Blocks': 334,
          'Shared Read Blocks': 10412,
          'Temp Read Blocks': 3022,
          'Temp Written Blocks': 3024,
          Plans: [
            {
              'Node Type': 'Sort',
              'Parent Relationship': 'Outer',
              'Startup Cost': 152026.09,
              'Total Cost': 177026.09,
              'Plan Rows': 1000000,
              'Plan Width': 120,
              'Actual Startup Time': 2383.994,
              'Actual Total Time': 2384.002,
              'Actual Rows': 50050,
              'Actual Loops': 1,
              'Sort Key': ['created_at DESC'],
              'Sort Method': 'external merge',
              'Sort Space Used': 24188,
              'Sort Space Type': 'Disk',
              'Shared Hit Blocks': 334,
              'Shared Read Blocks': 10412,
              'Temp Read Blocks': 3022,
              'Temp Written Blocks': 3024,
              Plans: [
                {
                  'Node Type': 'Seq Scan',
                  'Parent Relationship': 'Outer',
                  'Relation Name': 'events',
                  Alias: 'events',
                  'Startup Cost': 0.0,
                  'Total Cost': 19012.0,
                  'Plan Rows': 1000000,
                  'Plan Width': 120,
                  'Actual Startup Time': 0.038,
                  'Actual Total Time': 1188.742,
                  'Actual Rows': 1000000,
                  'Actual Loops': 1,
                  'Shared Hit Blocks': 334,
                  'Shared Read Blocks': 10412,
                },
              ],
            },
          ],
        },
        'Planning Time': 0.412,
        Triggers: [],
        'Execution Time': 2384.911,
      },
    ]),
    explainText: `Limit  (cost=178026.06..178028.31 rows=50 width=120) (actual time=2384.012..2384.164 rows=50 loops=1)
      Buffers: shared hit=334 read=10412, temp read=3022 written=3024
  ->  Sort  (cost=152026.09..177026.09 rows=1000000 width=120) (actual time=2383.994..2384.002 rows=50050 loops=1)
        Sort Key: created_at DESC
        Sort Method: external merge  Disk: 24188kB
        Buffers: shared hit=334 read=10412, temp read=3022 written=3024
        ->  Seq Scan on events  (cost=0.00..19012.00 rows=1000000 width=120) (actual time=0.038..1188.742 rows=1000000 loops=1)
              Buffers: shared hit=334 read=10412
Planning Time: 0.412 ms
Execution Time: 2384.911 ms`,
  },
  {
    id: 'join-cardinality-explosion',
    title: 'Join cardinality explosion (nested loop)',
    blurb:
      'The planner underestimated EU orders 200x, picked a Nested Loop, and re-ran the inner index scan 40,000 times — 5.9s.',
    ddl: `CREATE TABLE orders (
  id          bigserial PRIMARY KEY,
  region      text NOT NULL,
  created_at  timestamptz NOT NULL
);
CREATE TABLE order_items (
  id          bigserial PRIMARY KEY,
  order_id    bigint NOT NULL REFERENCES orders(id),
  product_id  bigint NOT NULL,
  quantity    integer NOT NULL
);
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE TABLE products (
  id    bigserial PRIMARY KEY,
  title text NOT NULL
);
-- orders ~400,000 rows (EU: ~40,000), order_items ~2M, products ~50,000`,
    sql: "SELECT o.id, o.created_at, p.title, oi.quantity\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nJOIN products p ON p.id = oi.product_id\nWHERE o.region = 'EU';",
    explainJson: JSON.stringify([
      {
        Plan: {
          'Node Type': 'Nested Loop',
          'Join Type': 'Inner',
          'Startup Cost': 1.15,
          'Total Cost': 189042.31,
          'Plan Rows': 4000,
          'Plan Width': 64,
          'Actual Startup Time': 0.198,
          'Actual Total Time': 5912.44,
          'Actual Rows': 480123,
          'Actual Loops': 1,
          'Shared Hit Blocks': 771276,
          'Shared Read Blocks': 6335,
          Plans: [
            {
              'Node Type': 'Seq Scan',
              'Parent Relationship': 'Outer',
              'Relation Name': 'orders',
              Alias: 'o',
              'Startup Cost': 0.0,
              'Total Cost': 9812.0,
              'Plan Rows': 200,
              'Plan Width': 16,
              'Actual Startup Time': 0.031,
              'Actual Total Time': 412.881,
              'Actual Rows': 40000,
              'Actual Loops': 1,
              Filter: "(region = 'EU'::text)",
              'Rows Removed by Filter': 360000,
              'Shared Hit Blocks': 2812,
              'Shared Read Blocks': 4231,
            },
            {
              'Node Type': 'Nested Loop',
              'Parent Relationship': 'Inner',
              'Join Type': 'Inner',
              'Startup Cost': 0.58,
              'Total Cost': 178.72,
              'Plan Rows': 25,
              'Plan Width': 56,
              'Actual Startup Time': 0.052,
              'Actual Total Time': 0.137,
              'Actual Rows': 12,
              'Actual Loops': 40000,
              'Shared Hit Blocks': 768464,
              'Shared Read Blocks': 2104,
              Plans: [
                {
                  'Node Type': 'Index Scan',
                  'Parent Relationship': 'Outer',
                  'Scan Direction': 'Forward',
                  'Index Name': 'order_items_order_id_idx',
                  'Relation Name': 'order_items',
                  Alias: 'oi',
                  'Startup Cost': 0.43,
                  'Total Cost': 122.31,
                  'Plan Rows': 2,
                  'Plan Width': 20,
                  'Actual Startup Time': 0.029,
                  'Actual Total Time': 0.078,
                  'Actual Rows': 12,
                  'Actual Loops': 40000,
                  'Index Cond': '(order_id = o.id)',
                  'Shared Hit Blocks': 288341,
                  'Shared Read Blocks': 2104,
                },
                {
                  'Node Type': 'Index Scan',
                  'Parent Relationship': 'Inner',
                  'Scan Direction': 'Forward',
                  'Index Name': 'products_pkey',
                  'Relation Name': 'products',
                  Alias: 'p',
                  'Startup Cost': 0.29,
                  'Total Cost': 0.34,
                  'Plan Rows': 1,
                  'Plan Width': 44,
                  'Actual Startup Time': 0.007,
                  'Actual Total Time': 0.003,
                  'Actual Rows': 1,
                  'Actual Loops': 480123,
                  'Index Cond': '(p.id = oi.product_id)',
                  'Shared Hit Blocks': 480123,
                },
              ],
            },
          ],
        },
        'Planning Time': 1.204,
        Triggers: [],
        'Execution Time': 5913.02,
      },
    ]),
    explainText: `Nested Loop  (cost=1.15..189042.31 rows=4000 width=64) (actual time=0.198..5912.44 rows=480123 loops=1)
      Buffers: shared hit=771276 read=6335
  ->  Seq Scan on orders o  (cost=0.00..9812.00 rows=200 width=16) (actual time=0.031..412.881 rows=40000 loops=1)
        Filter: (region = 'EU'::text)
        Rows Removed by Filter: 360000
        Buffers: shared hit=2812 read=4231
  ->  Nested Loop  (cost=0.58..178.72 rows=25 width=56) (actual time=0.052..0.137 rows=12 loops=40000)
        Buffers: shared hit=768464 read=2104
        ->  Index Scan using order_items_order_id_idx on order_items oi  (cost=0.43..122.31 rows=2 width=20) (actual time=0.029..0.078 rows=12 loops=40000)
              Index Cond: (order_id = o.id)
              Buffers: shared hit=288341 read=2104
        ->  Index Scan using products_pkey on products p  (cost=0.29..0.34 rows=1 width=44) (actual time=0.007..0.003 rows=1 loops=480123)
              Index Cond: (p.id = oi.product_id)
              Buffers: shared hit=480123
Planning Time: 1.204 ms
Execution Time: 5913.020 ms`,
  },
  {
    id: 'sort-hash-spill',
    title: 'Sort and hash both spilling to disk',
    blurb:
      '3M settled payments joined against 1.2M customers, then sorted — 178MB temp file and 64 hash batches. 8.2s total.',
    ddl: `CREATE TABLE payments (
  id           bigserial PRIMARY KEY,
  customer_id  bigint NOT NULL,
  status       text NOT NULL,
  amount       numeric(12,2) NOT NULL,
  created_at   timestamptz NOT NULL
);
CREATE TABLE customers (
  id    bigserial PRIMARY KEY,
  name  text NOT NULL
);
-- payments ~3,400,000 (settled: ~3,000,000), customers ~1,200,000
-- work_mem = 4MB (default-ish)`,
    sql: "SELECT p.id, p.amount, p.created_at, c.name\nFROM payments p\nJOIN customers c ON c.id = p.customer_id\nWHERE p.status = 'settled'\nORDER BY p.created_at DESC\nLIMIT 100;",
    explainJson: JSON.stringify([
      {
        Plan: {
          'Node Type': 'Limit',
          'Startup Cost': 622314.52,
          'Total Cost': 622314.77,
          'Plan Rows': 100,
          'Plan Width': 72,
          'Actual Startup Time': 8212.411,
          'Actual Total Time': 8212.524,
          'Actual Rows': 100,
          'Actual Loops': 1,
          'Shared Hit Blocks': 512,
          'Shared Read Blocks': 51622,
          'Temp Read Blocks': 26398,
          'Temp Written Blocks': 26414,
          Plans: [
            {
              'Node Type': 'Sort',
              'Parent Relationship': 'Outer',
              'Startup Cost': 622314.52,
              'Total Cost': 629817.65,
              'Plan Rows': 3001252,
              'Plan Width': 72,
              'Actual Startup Time': 8212.402,
              'Actual Total Time': 8212.419,
              'Actual Rows': 3000125,
              'Actual Loops': 1,
              'Sort Key': ['p.created_at DESC'],
              'Sort Method': 'external merge',
              'Sort Space Used': 182400,
              'Sort Space Type': 'Disk',
              'Shared Hit Blocks': 512,
              'Shared Read Blocks': 51622,
              'Temp Read Blocks': 26398,
              'Temp Written Blocks': 26414,
              Plans: [
                {
                  'Node Type': 'Hash Join',
                  'Parent Relationship': 'Outer',
                  'Join Type': 'Inner',
                  'Startup Cost': 84512.08,
                  'Total Cost': 421118.9,
                  'Plan Rows': 3001252,
                  'Plan Width': 72,
                  'Actual Startup Time': 214.09,
                  'Actual Total Time': 6104.81,
                  'Actual Rows': 3000125,
                  'Actual Loops': 1,
                  'Hash Cond': '(p.customer_id = c.id)',
                  'Shared Hit Blocks': 512,
                  'Shared Read Blocks': 51622,
                  'Temp Read Blocks': 3598,
                  'Temp Written Blocks': 3602,
                  Plans: [
                    {
                      'Node Type': 'Seq Scan',
                      'Parent Relationship': 'Outer',
                      'Relation Name': 'payments',
                      Alias: 'p',
                      'Startup Cost': 0.0,
                      'Total Cost': 98212.0,
                      'Plan Rows': 3001252,
                      'Plan Width': 48,
                      'Actual Startup Time': 0.041,
                      'Actual Total Time': 4412.33,
                      'Actual Rows': 3000125,
                      'Actual Loops': 1,
                      Filter: "(status = 'settled'::text)",
                      'Rows Removed by Filter': 398875,
                      'Shared Hit Blocks': 512,
                      'Shared Read Blocks': 36600,
                    },
                    {
                      'Node Type': 'Hash',
                      'Parent Relationship': 'Inner',
                      'Startup Cost': 26312.0,
                      'Total Cost': 26312.0,
                      'Plan Rows': 1200000,
                      'Plan Width': 24,
                      'Actual Startup Time': 1610.29,
                      'Actual Total Time': 1610.29,
                      'Actual Rows': 1200000,
                      'Actual Loops': 1,
                      'Hash Buckets': 262144,
                      'Hash Batches': 64,
                      'Original Hash Batches': 64,
                      'Peak Memory Usage': 24128,
                      'Shared Read Blocks': 13210,
                      'Temp Read Blocks': 3598,
                      'Temp Written Blocks': 3602,
                      Plans: [
                        {
                          'Node Type': 'Seq Scan',
                          'Parent Relationship': 'Outer',
                          'Relation Name': 'customers',
                          Alias: 'c',
                          'Startup Cost': 0.0,
                          'Total Cost': 26312.0,
                          'Plan Rows': 1200000,
                          'Plan Width': 24,
                          'Actual Startup Time': 0.023,
                          'Actual Total Time': 742.11,
                          'Actual Rows': 1200000,
                          'Actual Loops': 1,
                          'Shared Read Blocks': 13210,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        'Planning Time': 0.842,
        Triggers: [],
        'Execution Time': 8213.104,
      },
    ]),
    explainText: `Limit  (cost=622314.52..622314.77 rows=100 width=72) (actual time=8212.411..8212.524 rows=100 loops=1)
      Buffers: shared hit=512 read=51622, temp read=26398 written=26414
  ->  Sort  (cost=622314.52..629817.65 rows=3001252 width=72) (actual time=8212.402..8212.419 rows=3000125 loops=1)
        Sort Key: p.created_at DESC
        Sort Method: external merge  Disk: 182400kB
        Buffers: shared hit=512 read=51622, temp read=26398 written=26414
        ->  Hash Join  (cost=84512.08..421118.90 rows=3001252 width=72) (actual time=214.090..6104.810 rows=3000125 loops=1)
              Hash Cond: (p.customer_id = c.id)
              Buffers: shared hit=512 read=51622, temp read=3598 written=3602
              ->  Seq Scan on payments p  (cost=0.00..98212.00 rows=3001252 width=48) (actual time=0.041..4412.330 rows=3000125 loops=1)
                    Filter: (status = 'settled'::text)
                    Rows Removed by Filter: 398875
                    Buffers: shared hit=512 read=36600
              ->  Hash  (cost=26312.00..26312.00 rows=1200000 width=24) (actual time=1610.290..1610.290 rows=1200000 loops=1)
                    Buckets: 262144  Batches: 64  Memory Usage: 24128kB
                    Buffers: shared read=13210, temp read=3598 written=3602
                    ->  Seq Scan on customers c  (cost=0.00..26312.00 rows=1200000 width=24) (actual time=0.023..742.110 rows=1200000 loops=1)
                          Buffers: shared read=13210
Planning Time: 0.842 ms
Execution Time: 8213.104 ms`,
  },
];

export const SAMPLES: Sample[] = [
  missingIndex,
  {
    ...missingIndex,
    id: 'missing-index-text',
    title: 'Missing index on orders.customer_id (text EXPLAIN)',
    blurb:
      'The same missing-index scenario, pasted as classic text EXPLAIN output instead of JSON.',
    format: 'text',
  },
  ...BASE_SAMPLES,
];
