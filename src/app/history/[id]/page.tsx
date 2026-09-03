import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ResultsView from '@/components/ResultsView';
import { getSession } from '@/lib/auth/session';
import { getAnalysis } from '@/lib/history-service';

export const dynamic = 'force-dynamic';

export default async function HistoryDetailPage({ params }: PageProps<'/history/[id]'>) {
  const session = await getSession();
  if (!session) {
    redirect('/login?next=/history');
  }

  const { id } = await params;
  const result = await getAnalysis(id, session.userId);
  if (!result) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <Link href="/history" className="text-sm text-emerald-400 hover:underline">
          ← Back to history
        </Link>
        <span className="text-xs text-zinc-500">saved analysis (replayed)</span>
      </div>
      <ResultsView result={result} />
    </div>
  );
}
