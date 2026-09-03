'use client';

import { useEffect } from 'react';
import PageContainer from '@/components/ui/PageContainer';

export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer>
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <h2 className="text-base font-semibold text-zinc-100">Something went wrong</h2>
        <p className="mt-1 max-w-md text-sm text-zinc-500">
          This page failed to load. The error has been logged on the server — try again in a moment.
          {error.digest ? (
            <>
              {' '}
              Reference:{' '}
              <span className="font-mono text-xs text-zinc-600">{error.digest.slice(0, 8)}</span>
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Try again
        </button>
      </div>
    </PageContainer>
  );
}
