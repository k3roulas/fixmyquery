'use client';

import type { PlanNode } from '@/lib/types';

function shareColor(pct: number): string {
  if (pct > 50) return 'bg-red-500';
  if (pct > 20) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function timeText(pct: number): string {
  if (pct > 50) return 'text-red-400';
  if (pct > 20) return 'text-amber-400';
  return 'text-emerald-400';
}

interface Props {
  node: PlanNode;
  selected: boolean;
  flagged: boolean;
  onSelect: (id: string) => void;
}

export default function PlanNodeCard({ node, selected, flagged, onSelect }: Props) {
  const label = [node.relation, node.alias].filter(Boolean).join(' as ');
  const hasTime = node.inclusiveMs > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className={`block w-full rounded-lg border px-3 py-2 text-left transition-colors ${
        selected
          ? 'border-emerald-500/70 bg-emerald-950/30'
          : flagged
            ? 'border-amber-700/60 bg-zinc-900 hover:bg-zinc-800/70'
            : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800/70'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-zinc-100">
          {flagged ? <span className="mr-1 text-amber-400">▲</span> : null}
          {node.nodeType}
          {label ? <span className="ml-1.5 font-normal text-zinc-400"> on {label}</span> : null}
        </span>
        {hasTime ? (
          <span className={`shrink-0 font-mono text-xs ${timeText(node.timeSharePct)}`}>
            {formatMs(node.inclusiveMs)} · {Math.round(node.timeSharePct)}%
          </span>
        ) : (
          <span className="shrink-0 font-mono text-xs text-zinc-500">no timing</span>
        )}
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${shareColor(node.timeSharePct)}`}
          style={{ width: `${Math.max(node.timeSharePct, 1)}%` }}
        />
      </div>
    </button>
  );
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms >= 1) return `${ms.toFixed(1)}ms`;
  return `${Math.round(ms * 1000)}µs`;
}
