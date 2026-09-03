import { redirect } from 'next/navigation';
import Workspace from '@/components/Workspace';
import { getSession } from '@/lib/auth/session';

export default async function AppPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?next=/app');
  }
  return <Workspace />;
}
