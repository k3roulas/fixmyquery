'use client';

import { formatMs } from '@/lib/format';
import { describeNodeType } from '@/lib/nodeTypeDescriptions';
import type { Finding, PlanNode } from '@/lib/types';

import HelpDot from './HelpDot';

interface Props {
  node: PlanNode | null;
  findings: Finding[];
}

const NODE_HELP: Record<string, string> = {
  'Inclusive time':
    "Time spent in this node plus all its children; the % is its share of the query's total execution time.",
  Loops:
    'Number of times this node ran. Costs multiply by loops — a fast node executed 10,000 times can dominate the plan.',
  'Rows (est → actual per loop)':
    'Planner estimate vs measured rows returned per loop. Large gaps point to stale statistics or misestimated predicates.',
  'Est/actual ratio':
    'Actual ÷ estimated rows. Far from 1× the planner misjudged, which can lead to wrong join or scan strategy choices.',
  Relation: 'The table (and its alias) this node reads.',
  Index:
    'The index this scan uses via its Index Cond. A filter already served by this index does not need a new one.',
  'Filter / Index Cond':
    'Predicate applied here: an Index Cond seeks the index directly; a plain Filter discards rows after reading them.',
  'Join Filter':
    'Predicate checked on each row pair during the join — evaluated per match and unable to use an index on the outer side.',
  'Rows removed by filter':
    'Rows read then discarded by the filter. Close to actual rows, it means the scan wastes most of its work — usually fixed by an index.',
  'Sort key':
    'Columns and direction the sort uses. An index with the same key and direction lets Postgres skip this sort entirely.',
  'Sort method':
    "Algorithm used and its footprint. Disk space or 'external merge' means work_mem was too small for the sort.",
  Hash: 'Hash table shape for this node. More than 1 batch means it spilled to disk — raise work_mem or shrink the build side.',
  'Shared buffers':
    '8kB pages touched here: hit = served from Postgres cache, read = fetched from disk. High reads on a hot table hint at cache or index problems.',
  'Temp buffers':
    '8kB pages in temporary files (read + written). Non-zero means a sort or hash spilled out of work_mem onto disk.',
};

function Row({ label, value }: { label: string; value: string }) {
  const help = NODE_HELP[label];
  return (
    <div className="flex gap-3 px-3 py-1.5 text-sm odd:bg-zinc-900/60">
      <dt className="group relative w-44 shrink-0 text-zinc-500">
        {label}
        {help ? <HelpDot text={help} side="bottom" /> : null}
      </dt>
      <dd className="min-w-0 break-words font-mono text-xs text-zinc-200">{value}</dd>
    </div>
  );
}

export default function NodeDetailPanel({ node, findings }: Props) {
  if (!node) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
        Click a node in the plan tree to inspect its details.
      </div>
    );
  }

  const misestimate = node.estRows > 0 ? `${(node.actualRows / node.estRows).toFixed(1)}×` : 'n/a';

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <h3 className="text-sm font-semibold text-zinc-100">{node.nodeType}</h3>
        <span className="font-mono text-xs text-zinc-500">{node.id}</span>
      </div>
      <p className="border-b border-zinc-800 px-3 py-2 text-xs leading-relaxed text-zinc-400">
        {describeNodeType(node.nodeType)}
      </p>
      <dl className="divide-y divide-zinc-800/60">
        <Row
          label="Inclusive time"
          value={`${formatMs(node.inclusiveMs)} (${Math.round(node.timeSharePct)}% of query)`}
        />
        <Row label="Loops" value={String(node.actualLoops)} />
        <Row
          label="Rows (est → actual per loop)"
          value={`${node.estRows.toLocaleString()} → ${node.actualRows.toLocaleString()}`}
        />
        <Row label="Est/actual ratio" value={misestimate} />
        {node.relation ? (
          <Row
            label="Relation"
            value={node.alias ? `${node.relation} as ${node.alias}` : node.relation}
          />
        ) : null}
        {node.indexName ? <Row label="Index" value={node.indexName} /> : null}
        {node.filter ? <Row label="Filter / Index Cond" value={node.filter} /> : null}
        {node.joinFilter ? <Row label="Join Filter" value={node.joinFilter} /> : null}
        {node.rowsRemovedByFilter !== undefined ? (
          <Row label="Rows removed by filter" value={node.rowsRemovedByFilter.toLocaleString()} />
        ) : null}
        {node.sortKey ? <Row label="Sort key" value={node.sortKey} /> : null}
        {node.sortMethod ? (
          <Row
            label="Sort method"
            value={`${node.sortMethod}${node.sortSpaceUsedKb ? `, ${node.sortSpaceUsedKb}kB ${node.sortSpaceType ?? ''}` : ''}`}
          />
        ) : null}
        {node.hashBatches !== undefined ? (
          <Row
            label="Hash"
            value={`buckets ${node.hashBuckets ?? '?'} · batches ${node.hashBatches}`}
          />
        ) : null}
        {node.sharedHitBlocks !== undefined || node.sharedReadBlocks !== undefined ? (
          <Row
            label="Shared buffers"
            value={`hit ${node.sharedHitBlocks ?? 0} · read ${node.sharedReadBlocks ?? 0}`}
          />
        ) : null}
        {node.tempWrittenBlocks !== undefined ? (
          <Row
            label="Temp buffers"
            value={`read ${node.tempReadBlocks ?? 0} · written ${node.tempWrittenBlocks}`}
          />
        ) : null}
      </dl>
      {findings.length > 0 ? (
        <div className="border-t border-zinc-800 p-3">
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-amber-400 uppercase">
            Findings on this node
          </h4>
          <ul className="space-y-2">
            {findings.map((f, index) => (
              <li
                key={`${f.ruleId}-${f.nodeId}-${index}`}
                className="rounded border border-amber-900/50 bg-amber-950/20 p-2 text-xs text-zinc-300"
              >
                <span className="font-semibold text-amber-300">{f.title}</span>
                <p className="mt-0.5 text-zinc-400">{f.evidence}</p>
                <p className="mt-0.5 text-zinc-500">{f.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
