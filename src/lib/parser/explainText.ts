import type { PlanNode } from '../types';
import type { JsonParseResult } from './explainJson';

interface NodeMatch {
  depth: number;
  nodeType: string;
  relation: string | undefined;
  alias: string | undefined;
  indexName: string | undefined;
  estRows: number;
  actualTimeMs: number;
  actualRows: number;
  actualLoops: number;
}

const NODE_LINE =
  /^(?<arrow>\s*->\s*|^\s*)(?<desc>.+?)\s+\(cost=\d+(?:\.\d+)?\.\.\d+(?:\.\d+)? rows=(?<rows>\d+) width=\d+\)(?:\s+\(actual time=[\d.]+\.\.(?<time>[\d.]+) rows=(?<arows>\d+) loops=(?<loops>\d+)\))?/;

function parseDescription(desc: string): {
  nodeType: string;
  relation: string | undefined;
  alias: string | undefined;
  indexName: string | undefined;
} {
  let nodeType = desc;
  let indexName: string | undefined;
  let relation: string | undefined;
  let alias: string | undefined;

  const usingMatch = desc.match(/^(.*?) using ([\w"]+)\s*(?:on (.*))?$/);
  if (usingMatch?.[1] && usingMatch[2]) {
    nodeType = usingMatch[1].trim();
    indexName = usingMatch[2];
    if (usingMatch[3]) {
      const parts = usingMatch[3].trim().split(/\s+/);
      relation = parts[0];
      alias = parts[1];
    }
    return { nodeType, relation, alias, indexName };
  }

  const onMatch = desc.match(/^(.*?) on ([\w".]+)(?:\s+([\w"]+))?$/);
  if (onMatch?.[1] && onMatch[2]) {
    nodeType = onMatch[1].trim();
    relation = onMatch[2];
    alias = onMatch[3];
    return { nodeType, relation, alias, indexName };
  }

  return { nodeType: nodeType.trim(), relation, alias, indexName };
}

function matchNodeLine(line: string): NodeMatch | null {
  const m = NODE_LINE.exec(line);
  if (!m?.groups) return null;
  const arrow = m.groups.arrow ?? '';
  const depth = arrow.includes('->')
    ? Math.floor(arrow.slice(0, arrow.indexOf('->')).length / 6) + 1
    : 0;
  const parsedDesc = parseDescription(m.groups.desc ?? '');
  return {
    depth,
    nodeType: parsedDesc.nodeType,
    relation: parsedDesc.relation,
    alias: parsedDesc.alias,
    indexName: parsedDesc.indexName,
    estRows: Number(m.groups.rows ?? 0),
    actualTimeMs: Number(m.groups.time ?? 0),
    actualRows: Number(m.groups.arows ?? 0),
    actualLoops: Number(m.groups.loops ?? 1),
  };
}

function applyAttribute(node: PlanNode, line: string): void {
  let m = line.match(/^\s*Filter:\s(.+)$/);
  if (m?.[1] && !node.filter) {
    node.filter = m[1];
    return;
  }
  m = line.match(/^\s*(?:Index Cond|Index Filter):\s(.+)$/);
  if (m?.[1] && !node.filter) {
    node.filter = m[1];
    return;
  }
  m = line.match(/^\s*Join Filter:\s(.+)$/);
  if (m?.[1]) {
    node.joinFilter = m[1];
    return;
  }
  m = line.match(/^\s*Sort Key:\s(.+)$/);
  if (m?.[1]) {
    node.sortKey = m[1];
    return;
  }
  m = line.match(/^\s*Sort Method:\s(.+?)\s+(?:Disk|Memory):\s*(\d+)kB$/);
  if (m?.[1] && m[2]) {
    node.sortMethod = m[1];
    node.sortSpaceUsedKb = Number(m[2]);
    node.sortSpaceType = line.includes('Disk:') ? 'disk' : 'memory';
    return;
  }
  m = line.match(/^\s*Sort Method:\s(.+)$/);
  if (m?.[1]) {
    node.sortMethod = m[1];
    node.sortSpaceType = 'memory';
    return;
  }
  m = line.match(/^\s*Buckets:\s(\d+)\s+Batches:\s(\d+)\s+Memory Usage:\s(\d+)kB$/);
  if (m?.[1] && m[2] && m[3]) {
    node.hashBuckets = Number(m[1]);
    node.hashBatches = Number(m[2]);
    return;
  }
  m = line.match(/^\s*Rows Removed by Filter:\s(\d+)$/);
  if (m?.[1]) {
    node.rowsRemovedByFilter = Number(m[1]);
    return;
  }
  m = line.match(/^\s*Buffers:\s(.+)$/);
  if (m?.[1]) {
    // "shared hit=132 read=4256, temp read=6042 written=6044" — hit/read belong to the
    // "shared" segment, temp has its own; PG only prefixes the first token with "shared".
    for (const segment of m[1].split(/,\s*/)) {
      if (segment.startsWith('shared')) {
        const hit = segment.match(/hit=(\d+)/);
        const read = segment.match(/read=(\d+)/);
        if (hit?.[1]) node.sharedHitBlocks = Number(hit[1]);
        if (read?.[1]) node.sharedReadBlocks = Number(read[1]);
      } else if (segment.startsWith('temp')) {
        const tempRead = segment.match(/read=(\d+)/);
        const tempWritten = segment.match(/written=(\d+)/);
        if (tempRead?.[1]) node.tempReadBlocks = Number(tempRead[1]);
        if (tempWritten?.[1]) node.tempWrittenBlocks = Number(tempWritten[1]);
      }
    }
  }
}

export function parseExplainText(input: string): JsonParseResult {
  let counter = 0;
  const stack: PlanNode[] = [];
  let root: PlanNode | null = null;
  let maxActualTime = 0;

  const lines = input.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim() === '') continue;

    const totalMatch = line.match(/^Execution Time:\s([\d.]+)\s*ms$/);
    if (totalMatch?.[1]) {
      maxActualTime = Number(totalMatch[1]);
      continue;
    }
    if (/^Planning Time:|^Settings:|^Query Identifier|^Triggers:|^Planning:/.test(line)) {
      continue;
    }

    const nodeMatch = matchNodeLine(line);
    if (nodeMatch) {
      const { depth, ...fields } = nodeMatch;
      counter += 1;
      const node: PlanNode = {
        id: `n${counter - 1}`,
        nodeType: fields.nodeType,
        actualLoops: fields.actualLoops,
        actualTimeMs: fields.actualTimeMs,
        estRows: fields.estRows,
        actualRows: fields.actualRows,
        inclusiveMs: 0,
        timeSharePct: 0,
        children: [],
      };
      if (fields.relation) node.relation = fields.relation;
      if (fields.alias) node.alias = fields.alias;
      if (fields.indexName) node.indexName = fields.indexName;

      while (stack.length > depth) stack.pop();
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push(node);
      } else {
        root = node;
      }
      stack.push(node);
    } else if (stack.length > 0) {
      const current = stack[stack.length - 1];
      if (current) {
        applyAttribute(current, line);
      }
    }
  }

  if (!root) {
    throw new Error('No plan nodes found in text input');
  }

  if (maxActualTime === 0) {
    maxActualTime = root.actualTimeMs;
  }

  return { root, planningMs: 0, executionMs: maxActualTime };
}
