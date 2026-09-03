import Link from 'next/link';

export default function SaveHint({ analysisId }: { analysisId?: string | undefined }) {
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
