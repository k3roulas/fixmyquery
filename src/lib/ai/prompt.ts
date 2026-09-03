import { walk } from '@/lib/analyzer/metrics';
import type { Finding, ParsedPlan } from '@/lib/types';

const SYSTEM_PROMPT = `You are a senior Postgres DBA reviewing a slow query using its EXPLAIN (ANALYZE, BUFFERS) plan.

Rules of engagement:
- Trust the measured numbers in the plan outline and pre-computed findings. Never invent metrics. If a number matters to your explanation, quote it from the input.
- Ground every bottleneck in a specific plan node (use its nodeId when one matches).
- Propose rewrites that are valid PostgreSQL. Prefer the minimal change that fixes the dominant cost first; offer at most 3 sql variants.
- Only propose indexes that match an actual filter/join/sort in the plan. Never propose an index already shown as used (Index Cond with an index name).
- If any bottleneck fix, sql rationale, or the summary recommends creating an index, that index MUST also appear in proposed_indexes with complete CREATE INDEX DDL. proposed_indexes is [] only when you recommend no index at all.
- Be honest about uncertainty in caveats (e.g. stats freshness, data distribution).

Respond with ONLY a json object of this exact shape:
{
  "summary": "2-4 sentence verdict naming the dominant cost",
  "bottlenecks": [{"nodeId": "n3 or omit", "title": "...", "severity": "high|medium|low", "explanation": "plain-English why, citing measured numbers", "fix": "concrete action"}],
  "optimized_sql": [{"label": "short name", "sql": "full rewritten SELECT", "rationale": "why this is faster"}],
  "proposed_indexes": [{"name": "idx_name", "ddl": "CREATE INDEX ...", "reason": "which filter/sort it serves"}],
  "caveats": "verify assumptions before applying, e.g. run ANALYZE, check write overhead"
}
All keys are required; proposed_indexes may be an empty array and caveats may be an empty string. bottlenecks and optimized_sql must each have at least one entry.`;

function nodeLine(node: ParsedPlan['root'], depth: number): string {
  const parts = [
    node.id,
    node.nodeType,
    node.relation ? `on ${node.relation}` : '',
    node.indexName ? `using ${node.indexName}` : '',
    `${node.inclusiveMs.toFixed(1)}ms`,
    `${Math.round(node.timeSharePct)}%`,
    `est=${node.estRows}`,
    `act=${node.actualRows}`,
    `loops=${node.actualLoops}`,
    node.rowsRemovedByFilter !== undefined ? `removed=${node.rowsRemovedByFilter}` : '',
    node.filter ? `filter=${node.filter}` : '',
    node.joinFilter ? `join_filter=${node.joinFilter}` : '',
    node.sortMethod
      ? `sort=${node.sortMethod}${node.sortSpaceUsedKb ? ` ${node.sortSpaceUsedKb}kB ${node.sortSpaceType ?? ''}` : ''}`
      : '',
    node.hashBatches !== undefined ? `batches=${node.hashBatches}` : '',
    node.tempWrittenBlocks ? `temp_written=${node.tempWrittenBlocks}` : '',
  ].filter(Boolean);
  return `${'  '.repeat(depth)}${parts.join(' ')}`;
}

export function buildPlanOutline(plan: ParsedPlan): string {
  const lines: string[] = [];
  const depths = new Map<string, number>();
  function assignDepth(node: ParsedPlan['root'], depth: number) {
    depths.set(node.id, depth);
    for (const child of node.children) assignDepth(child, depth + 1);
  }
  assignDepth(plan.root, 0);
  for (const node of walk(plan.root)) {
    lines.push(nodeLine(node, depths.get(node.id) ?? 0));
  }
  return lines.join('\n');
}

export function buildMessages(input: {
  sql: string;
  plan: ParsedPlan;
  findings: Finding[];
}): { role: 'system' | 'user'; content: string }[] {
  const { sql, plan, findings } = input;
  const t = plan.totals;
  const userPrompt = `## Query
${sql}

## Plan totals
execution: ${t.executionMs}ms, planning: ${t.planningMs}ms, nodes: ${t.nodeCount}, shared hit/read blocks: ${t.sharedHitBlocks}/${t.sharedReadBlocks}, temp written blocks: ${t.tempWrittenBlocks}

## Plan tree (one line per node: id, type, relation, index, inclusive time, % of query, est/act rows, loops)
${buildPlanOutline(plan)}

## Deterministic findings (already computed — verify, explain, and build on these)
${JSON.stringify(
  findings.map((f) => ({ nodeId: f.nodeId, severity: f.severity, title: f.title })),
  null,
  0
)}

Analyze this query and respond with the json object.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
