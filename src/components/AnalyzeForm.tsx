'use client';

import { useState } from 'react';
import { SAMPLES } from '@/lib/samples';

interface Props {
  busy: boolean;
  onSubmit: (input: { sql: string; explainInput: string; title?: string | undefined }) => void;
}

export default function AnalyzeForm({ busy, onSubmit }: Props) {
  const [sql, setSql] = useState('');
  const [explainInput, setExplainInput] = useState('');
  const [title, setTitle] = useState('');

  function loadSample(id: string) {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    setSql(sample.sql);
    setExplainInput(sample.explainJson);
    setTitle(sample.title);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    onSubmit({ sql, explainInput, title: title || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="sample" className="mb-1 block text-sm font-medium text-zinc-300">
          Load a sample scenario
        </label>
        <select
          id="sample"
          onChange={(e) => e.target.value && loadSample(e.target.value)}
          defaultValue=""
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-600 focus:outline-none"
        >
          <option value="">— pick a sample to pre-fill —</option>
          {SAMPLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          Or paste your own query and its EXPLAIN (ANALYZE, BUFFERS) output below.
        </p>
      </div>

      <div>
        <label htmlFor="sql" className="mb-1 block text-sm font-medium text-zinc-300">
          SQL query
        </label>
        <textarea
          id="sql"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder="SELECT ... FROM ... WHERE ..."
          className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="explain" className="mb-1 block text-sm font-medium text-zinc-300">
          EXPLAIN output <span className="font-normal text-zinc-500">(JSON or text)</span>
        </label>
        <textarea
          id="explain"
          value={explainInput}
          onChange={(e) => setExplainInput(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder="EXPLAIN (ANALYZE, BUFFERS) SELECT ... — paste the plan here"
          className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-300">
          Title <span className="font-normal text-zinc-500">(optional, for saved history)</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={busy || sql.trim() === '' || explainInput.trim() === ''}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {busy ? 'Analyzing…' : 'Analyze query'}
      </button>
      <p className="text-center text-xs text-zinc-600">
        The AI review typically completes in well under a minute.
      </p>
    </form>
  );
}
