'use client';

import { useState } from 'react';
import { postJson } from '@/lib/api-client';
import type { AnalysisResult } from '@/lib/types';

import ErrorBanner from '../ui/ErrorBanner';
import PageContainer from '../ui/PageContainer';
import AnalyzeForm from './AnalyzeForm';
import ResultsView from './ResultsView';

export default function Workspace() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function analyze(input: { sql: string; explainInput: string; title?: string | undefined }) {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await postJson<AnalysisResult>('/api/analyze', input, 'Analysis failed');
    if (!res.ok) {
      setResult(null);
      setError(res.error);
    } else {
      setResult(res.data);
    }
    setBusy(false);
  }

  return (
    <PageContainer className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h1 className="mb-1 text-base font-semibold text-zinc-100">Analyze a query</h1>
          <p className="mb-4 text-xs text-zinc-500">
            Deterministic plan rules run first; AI review grounds itself in those numbers.
          </p>
          <AnalyzeForm busy={busy} onSubmit={analyze} />
        </div>
      </aside>
      <main className="min-w-0">
        {busy ? (
          <div
            role="status"
            className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
            <p className="mt-4 font-medium text-zinc-300">Analyzing your query…</p>
            <p className="mt-1 text-sm text-zinc-500">
              Deterministic rules run first, then the AI review — this can take up to ~1 minute.
            </p>
          </div>
        ) : error ? (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        ) : null}
        {result ? (
          <ResultsView result={result} />
        ) : (
          !error &&
          !busy && (
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
              <div>
                <p className="font-medium text-zinc-400">No analysis yet</p>
                <p className="mt-1">Pick a sample scenario or paste your own query to begin.</p>
              </div>
            </div>
          )
        )}
      </main>
    </PageContainer>
  );
}
