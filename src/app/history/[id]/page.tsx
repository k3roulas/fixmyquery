import Link from 'next/link';
import { notFound } from 'next/navigation';
import ResultsView from '@/components/analysis/ResultsView';
import PageContainer from '@/components/ui/PageContainer';
import { requireSession } from '@/lib/auth/guard';
import { getAnalysis } from '@/lib/history-service';
import { ROUTES } from '@/lib/routes';
import { buildHistoryDetailViewedMessage, notifySlack } from '@/lib/slack';

export const dynamic = 'force-dynamic';

export default async function HistoryDetailPage({ params }: PageProps<'/history/[id]'>) {
  const { id } = await params;
  const session = await requireSession(ROUTES.historyDetail(id));
  const result = await getAnalysis(id, session.userId);
  if (!result) {
    notFound();
  }

  notifySlack(() => buildHistoryDetailViewedMessage(session.email, { id, title: result.title }));

  return (
    <PageContainer className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={ROUTES.history} className="text-sm text-emerald-400 hover:underline">
          ← Back to history
        </Link>
        <span className="text-xs text-zinc-500">saved analysis</span>
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h1 className="mb-1 text-base font-semibold text-zinc-100">Original inputs</h1>
            <p className="mb-4 text-xs text-zinc-500">
              The query and EXPLAIN plan as they were submitted.
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="history-sql"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  SQL query
                </label>
                <textarea
                  id="history-sql"
                  readOnly
                  rows={6}
                  spellCheck={false}
                  value={result.sql}
                  className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
                />
              </div>
              <div>
                <label
                  htmlFor="history-explain"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  EXPLAIN output{' '}
                  <span className="font-normal text-zinc-500">({result.explainFormat})</span>
                </label>
                <textarea
                  id="history-explain"
                  readOnly
                  rows={10}
                  spellCheck={false}
                  value={result.explainInput}
                  className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
                />
              </div>
            </div>
          </div>
        </aside>
        <main className="min-w-0">
          <ResultsView result={result} />
        </main>
      </div>
    </PageContainer>
  );
}
