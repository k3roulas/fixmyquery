import Link from 'next/link';

export default function SaveHint({
  saved,
  analysisId,
}: {
  saved: boolean;
  analysisId?: string | undefined;
}) {
  if (saved) {
    return (
      <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">
        Saved to your history.{' '}
        {analysisId ? (
          <Link href={`/history/${analysisId}`} className="underline hover:text-emerald-200">
            View it here
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-400">
      This analysis was not saved.{' '}
      <Link href="/register" className="text-emerald-400 hover:underline">
        Register
      </Link>{' '}
      or{' '}
      <Link href="/login" className="text-emerald-400 hover:underline">
        sign in
      </Link>{' '}
      to keep a history of your analyses.
    </div>
  );
}
