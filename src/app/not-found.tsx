import Link from 'next/link';
import PageContainer from '@/components/ui/PageContainer';
import { ROUTES } from '@/lib/routes';

export default function NotFound() {
  return (
    <PageContainer>
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <h2 className="text-base font-semibold text-zinc-100">Page not found</h2>
        <p className="mt-1 max-w-md text-sm text-zinc-500">
          The page you are looking for does not exist, or a saved analysis could not be found.
        </p>
        <Link
          href={ROUTES.app}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Back to the analyzer
        </Link>
      </div>
    </PageContainer>
  );
}
