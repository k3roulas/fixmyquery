'use client';

import { useState } from 'react';
import { findNode } from '@/lib/analyzer/metrics';
import { formatMs } from '@/lib/format';
import type { AnalysisResult } from '@/lib/types';

import AiSummary from './AiSummary';
import BottleneckList from './BottleneckList';
import HelpDot from './HelpDot';
import IndexSuggestions from './IndexSuggestions';
import NodeDetailPanel from './NodeDetailPanel';
import PlanTree from './PlanTree';
import SqlVariants from './SqlVariants';

type Tab = 'tree' | 'findings' | 'sql' | 'indexes' | 'ai';

interface Props {
  result: AnalysisResult;
}

const SEVERITY_HELP =
  'Deterministic bottlenecks found by the rules, by severity. high = dominant cost driver: a scan or join eating most of the query time, a big estimate error, or a deep OFFSET. medium = real but secondary: spills to disk, non-SARGABLE filters. low = minor or preventive.';

const STAT_HELP: Record<string, string> = {
  execution:
    'Time spent actually running the query ("Execution Time" in EXPLAIN ANALYZE). Excludes planning.',
  planning:
    'Time the planner spent choosing this plan ("Planning Time"). Multiple seconds usually mean stale statistics or a huge join search space.',
  'plan nodes': 'Operations in the plan tree — scans, joins, sorts, and so on.',
  'shared hit / read':
    '8kB pages served from shared buffers (cache) vs read from disk. "read" counts cache misses — real disk I/O.',
  'temp written':
    '8kB pages spilled to temporary files when sorts or hashes outgrow work_mem. Healthy queries write ~0.',
};

function Stat({ label, value }: { label: string; value: string }) {
  const help = STAT_HELP[label];
  return (
    <div className="group relative rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <div className="font-mono text-sm font-semibold text-zinc-100">{value}</div>
      <div className="text-xs text-zinc-500">
        {label}
        {help ? <HelpDot text={help} /> : null}
      </div>
    </div>
  );
}

export default function ResultsView({ result }: Props) {
  const [tab, setTab] = useState<Tab>('tree');
  const [selectedId, setSelectedId] = useState<string | null>(result.root.id);

  const selected = selectedId === null ? null : (findNode(result.root, selectedId) ?? result.root);

  const nodeFindings = result.findings.filter((f) => selected !== null && f.nodeId === selected.id);

  function locate(nodeId: string) {
    setSelectedId(nodeId);
    setTab('tree');
  }

  const counts = {
    high: result.findings.filter((f) => f.severity === 'high').length,
    medium: result.findings.filter((f) => f.severity === 'medium').length,
    low: result.findings.filter((f) => f.severity === 'low').length,
  };

  const tabs: [Tab, string][] = [
    ['tree', 'Plan Tree'],
    ['findings', `Bottlenecks (${result.findings.length})`],
    ...(result.ai
      ? ([
          ['sql', `Optimized SQL (${result.ai.optimized_sql.length})`],
          ['indexes', `Indexes (${result.ai.proposed_indexes.length})`],
          ['ai', 'AI Review'],
        ] as [Tab, string][])
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-lg font-semibold text-zinc-100">{result.title}</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-400">
            {result.explainFormat}
          </span>
          {result.findings.length > 0 ? (
            <div className="group relative flex items-center">
              <span className="rounded border border-red-800/70 bg-red-950/60 px-1.5 py-0.5 text-red-300">
                {counts.high} high · {counts.medium} med · {counts.low} low
              </span>
              <HelpDot text={SEVERITY_HELP} anchor="right" side="bottom" />
            </div>
          ) : (
            <span className="rounded border border-emerald-800/70 bg-emerald-950/60 px-1.5 py-0.5 text-emerald-300">
              clean
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="execution" value={formatMs(result.totals.executionMs)} />
        <Stat label="planning" value={formatMs(result.totals.planningMs)} />
        <Stat label="plan nodes" value={String(result.totals.nodeCount)} />
        <Stat
          label="shared hit / read"
          value={`${result.totals.sharedHitBlocks} / ${result.totals.sharedReadBlocks}`}
        />
        <Stat label="temp written" value={String(result.totals.tempWrittenBlocks)} />
      </div>

      {result.aiError ? (
        <div
          role="status"
          className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-200"
        >
          {result.aiError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-zinc-800">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'border-b-2 border-emerald-500 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tree' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <PlanTree
            root={result.root}
            findings={result.findings}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
          />
          <div className="lg:sticky lg:top-4 lg:self-start">
            <NodeDetailPanel node={selected} findings={nodeFindings} />
          </div>
        </div>
      ) : null}
      {tab === 'findings' ? <BottleneckList findings={result.findings} onLocate={locate} /> : null}
      {tab === 'sql' && result.ai ? <SqlVariants variants={result.ai.optimized_sql} /> : null}
      {tab === 'indexes' && result.ai ? (
        <IndexSuggestions suggestions={result.ai.proposed_indexes} />
      ) : null}
      {tab === 'ai' && result.ai ? (
        <AiSummary
          ai={result.ai}
          reasoning={result.reasoning}
          model={result.model}
          onLocate={locate}
        />
      ) : null}
    </div>
  );
}
