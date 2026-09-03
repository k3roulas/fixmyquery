'use client';

import { useRef, useState } from 'react';
import type { AnalysisResult } from '@/lib/types';

import AnalyzeForm from './AnalyzeForm';
import ErrorBanner from './ErrorBanner';
import ResultsView from './ResultsView';
import SaveHint from './SaveHint';

export default function Workspace() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function analyze(input: { sql: string; explainInput: string; title?: string | undefined }) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setResult(null);
        setError(
          (body as { error?: string } | null)?.error ?? `Analysis failed (HTTP ${res.status})`
        );
        return;
      }
      setResult(body as AnalysisResult);
    } catch {
      setResult(null);
      setError('Could not reach the analysis endpoint. Is the dev server running?');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 p-4 sm:p-6 xl:grid-cols-[420px_minmax(0,1fr)]">
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
        {error ? (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        ) : null}
        {result ? (
          <div className="space-y-4">
            <ResultsView result={result} />
            {result.saved ? <SaveHint analysisId={result.analysisId} /> : null}
          </div>
        ) : (
          !error && (
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
              <div>
                <p className="font-medium text-zinc-400">No analysis yet</p>
                <p className="mt-1">Pick a sample scenario or paste your own query to begin.</p>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
