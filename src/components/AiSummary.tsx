'use client';

import { useState } from 'react';
import type { AiBottleneck, AiResult, Severity } from '@/lib/types';

const SEV_STYLE: Record<Severity, string> = {
  high: 'border-red-800/70 bg-red-950/60 text-red-300',
  medium: 'border-amber-800/70 bg-amber-950/60 text-amber-300',
  low: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
};

function Bottleneck({
  b,
  onLocate,
}: {
  b: AiBottleneck;
  onLocate?: ((id: string) => void) | undefined;
}) {
  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-1.5 py-0.5 text-xs font-medium ${SEV_STYLE[b.severity]}`}
        >
          {b.severity}
        </span>
        <h3 className="text-sm font-semibold text-zinc-100">{b.title}</h3>
        {b.nodeId ? (
          <button
            type="button"
            onClick={() => onLocate?.(b.nodeId as string)}
            className="font-mono text-xs text-emerald-400 hover:underline"
          >
            {b.nodeId} →
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-zinc-300">{b.explanation}</p>
      <p className="mt-1 text-sm text-zinc-400">
        <span className="font-medium text-zinc-300">Fix: </span>
        {b.fix}
      </p>
    </li>
  );
}

interface Props {
  ai: AiResult;
  reasoning: string | null;
  model: string;
  onLocate?: (nodeId: string) => void;
}

export default function AiSummary({ ai, reasoning, model, onLocate }: Props) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
            {model}
          </span>
          <span className="text-xs text-zinc-500">grounded in measured plan values</span>
        </div>
        {reasoning ? (
          <button
            type="button"
            onClick={() => setShowReasoning((v) => !v)}
            className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            {showReasoning ? 'Hide reasoning' : 'Show AI reasoning'}
          </button>
        ) : null}
      </div>

      {showReasoning && reasoning ? (
        <pre className="max-h-80 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-zinc-400">
          {reasoning}
        </pre>
      ) : null}

      <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-200">
        {ai.summary}
      </p>

      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          AI-verified bottlenecks
        </h3>
        <ul className="space-y-3">
          {ai.bottlenecks.map((b, index) => (
            <Bottleneck key={`${b.title}-${index}`} b={b} onLocate={onLocate} />
          ))}
        </ul>
      </div>

      {ai.caveats ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Caveats
          </h3>
          <p className="text-sm text-zinc-400">{ai.caveats}</p>
        </div>
      ) : null}
    </div>
  );
}
