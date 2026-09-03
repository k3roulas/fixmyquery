import Workspace from '@/components/analysis/Workspace';
import { requireSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  await requireSession();
  return <Workspace />;
}
