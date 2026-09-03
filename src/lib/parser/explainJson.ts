import type { PlanNode } from '../types';

interface RawNode {
  'Node Type'?: string;
  'Relation Name'?: string;
  Alias?: string;
  'Index Name'?: string;
  'Actual Loops'?: number;
  'Actual Total Time'?: number;
  'Plan Rows'?: number;
  'Actual Rows'?: number;
  Filter?: string;
  'Index Cond'?: string;
  'Join Filter'?: string;
  'Sort Key'?: string[] | string;
  'Sort Method'?: string;
  'Sort Space Used'?: number;
  'Sort Space Type'?: string;
  'Hash Batches'?: number;
  'Hash Buckets'?: number;
  'Shared Hit Blocks'?: number;
  'Shared Read Blocks'?: number;
  'Temp Read Blocks'?: number;
  'Temp Written Blocks'?: number;
  'Rows Removed by Filter'?: number;
  Plans?: RawNode[];
}

interface RawPlanRoot {
  Plan?: RawNode;
  'Planning Time'?: number;
  'Execution Time'?: number;
}

export interface JsonParseResult {
  root: PlanNode;
  planningMs: number;
  executionMs: number;
}

export function parseExplainJson(input: string): JsonParseResult {
  let counter = 0;

  function normalize(raw: RawNode): PlanNode {
    counter += 1;
    const node: PlanNode = {
      id: `n${counter - 1}`,
      nodeType: raw['Node Type'] ?? 'Unknown',
      actualLoops: raw['Actual Loops'] ?? 1,
      actualTimeMs: raw['Actual Total Time'] ?? 0,
      estRows: raw['Plan Rows'] ?? 0,
      actualRows: raw['Actual Rows'] ?? 0,
      inclusiveMs: 0,
      timeSharePct: 0,
      children: [],
    };

    const sortKey = raw['Sort Key'];
    const set = (key: keyof PlanNode, value: PlanNode[keyof PlanNode]) => {
      if (value !== undefined && value !== null) {
        node[key] = value as never;
      }
    };

    set('relation', raw['Relation Name']);
    set('alias', raw.Alias);
    set('indexName', raw['Index Name']);
    set('filter', raw.Filter ?? raw['Index Cond']);
    set('joinFilter', raw['Join Filter']);
    set('sortSpaceUsedKb', raw['Sort Space Used']);
    set('sortSpaceType', raw['Sort Space Type']);
    set('hashBatches', raw['Hash Batches']);
    set('hashBuckets', raw['Hash Buckets']);
    set('sharedHitBlocks', raw['Shared Hit Blocks']);
    set('sharedReadBlocks', raw['Shared Read Blocks']);
    set('tempReadBlocks', raw['Temp Read Blocks']);
    set('tempWrittenBlocks', raw['Temp Written Blocks']);
    set('rowsRemovedByFilter', raw['Rows Removed by Filter']);
    if (raw['Sort Method'] !== undefined) {
      node.sortMethod = raw['Sort Method'];
    }
    if (sortKey !== undefined) {
      node.sortKey = Array.isArray(sortKey) ? sortKey.join(', ') : sortKey;
    }

    for (const child of raw.Plans ?? []) {
      node.children.push(normalize(child));
    }
    return node;
  }

  const parsed: unknown = JSON.parse(input);
  const wrapper = Array.isArray(parsed) ? (parsed[0] as RawPlanRoot) : (parsed as RawPlanRoot);
  if (!wrapper || typeof wrapper !== 'object' || wrapper.Plan === undefined) {
    throw new Error('JSON plan must contain a top-level "Plan" object');
  }
  return {
    root: normalize(wrapper.Plan),
    planningMs: wrapper['Planning Time'] ?? 0,
    executionMs: wrapper['Execution Time'] ?? 0,
  };
}
