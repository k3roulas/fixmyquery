'use client';

import type { Finding } from '@/lib/types';

const STYLES: Record<Finding['severity'], { chip: string; label: string }> = {
  high: { chip: 'bg-red-950/60 text-red-300 border-red-800/70', label: 'High' },
  medium: { chip: 'bg-amber-950/60 text-amber-300 border-amber-800/70', label: 'Medium' },
  low: { chip: 'bg-zinc-800/60 text-zinc-300 border-zinc-700', label: 'Low' },
};

interface Props {
  findings: Finding[];
  onLocate: (nodeId: string) => void;
}

export default function BottleneckList({ findings, onLocate }: Props) {
  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4 text-sm text-emerald-300">
        No bottlenecks detected by the deterministic rules. This plan looks healthy — the AI review
        below may still spot opportunities.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {findings.map((f, index) => {
        const style = STYLES[f.severity];
        return (
          <li
            key={`${f.ruleId}-${f.nodeId}-${index}`}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${style.chip}`}>
                {style.label}
              </span>
              <h3 className="text-sm font-semibold text-zinc-100">{f.title}</h3>
              <span className="font-mono text-xs text-zinc-600">{f.ruleId}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-300">{f.evidence}</p>
            <p className="mt-1 text-sm text-zinc-400">
              <span className="font-medium text-zinc-300">Fix: </span>
              {f.suggestion}
            </p>
            <button
              type="button"
              onClick={() => onLocate(f.nodeId)}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Locate in plan tree →
            </button>
          </li>
        );
      })}
    </ul>
  );
}
