import { redirect } from 'next/navigation';
import HistoryTable from '@/components/HistoryTable';
import { getSession } from '@/lib/auth/session';
import { listAnalyses } from '@/lib/history-service';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?next=/history');
  }

  const rows = await listAnalyses(session.userId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Analysis history</h1>
        <p className="text-sm text-zinc-500">
          Your saved analyses, most recent first. Click a title to replay the full result.
        </p>
      </div>
      <HistoryTable rows={rows} />
    </div>
  );
}
