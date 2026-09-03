import HistoryTable from '@/components/history/HistoryTable';
import PageContainer from '@/components/ui/PageContainer';
import { requireSession } from '@/lib/auth/guard';
import { listAnalyses } from '@/lib/history-service';
import { ROUTES } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const session = await requireSession(ROUTES.history);

  const rows = await listAnalyses(session.userId);

  return (
    <PageContainer className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Analysis history</h1>
        <p className="text-sm text-zinc-500">
          Your saved analyses, most recent first. Click a title to replay the full result.
        </p>
      </div>
      <HistoryTable rows={rows} />
    </PageContainer>
  );
}
