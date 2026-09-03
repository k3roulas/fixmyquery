import Workspace from '@/components/Workspace';
import { getSession } from '@/lib/auth/session';

export default async function Home() {
  const session = await getSession();
  return <Workspace signedIn={session !== null} />;
}
