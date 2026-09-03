'use client';

import type { IndexSuggestion } from '@/lib/types';

import SqlBlock from './SqlBlock';

export default function IndexSuggestions({ suggestions }: { suggestions: IndexSuggestion[] }) {
  if (suggestions.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        No new indexes proposed — none of the plan's filters/sorts justified one.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {suggestions.map((s, index) => (
        <li
          key={`${s.name}-${index}`}
          className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-mono text-sm font-semibold text-emerald-300">{s.name}</h3>
          </div>
          <SqlBlock code={s.ddl} />
          <p className="mt-2 text-sm text-zinc-400">{s.reason}</p>
        </li>
      ))}
    </ul>
  );
}
