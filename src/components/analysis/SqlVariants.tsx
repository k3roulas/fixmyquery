'use client';

import type { SqlVariant } from '@/lib/types';

import SqlBlock from '../ui/SqlBlock';

export default function SqlVariants({ variants }: { variants: SqlVariant[] }) {
  if (variants.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        No rewritten SQL was proposed.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {variants.map((v, index) => (
        <li
          key={`${v.label}-${index}`}
          className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">{v.label}</h3>
            {v.syntaxOk ? (
              <span className="rounded border border-emerald-800/70 bg-emerald-950/60 px-1.5 py-0.5 text-xs text-emerald-300">
                syntax OK
              </span>
            ) : (
              <span
                className="rounded border border-amber-800/70 bg-amber-950/60 px-1.5 py-0.5 text-xs text-amber-300"
                title={v.syntaxError}
              >
                syntax check failed — review manually
              </span>
            )}
          </div>
          <p className="mb-2 text-sm text-zinc-400">{v.rationale}</p>
          <SqlBlock code={v.sql} />
          {!v.syntaxOk && v.syntaxError ? (
            <p className="mt-1 font-mono text-xs text-amber-400/80">{v.syntaxError}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
