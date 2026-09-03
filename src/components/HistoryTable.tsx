import Link from 'next/link';
import type { AnalysisRowSummary } from '@/lib/history-service';

export default function HistoryTable({ rows }: { rows: AnalysisRowSummary[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
        <p className="font-medium text-zinc-400">No saved analyses yet</p>
        <p className="mt-1">
          Run an analysis while signed in and it will appear here.{' '}
          <Link href="/" className="text-emerald-400 hover:underline">
            Analyze a query →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs tracking-wide text-zinc-500 uppercase">
            <th className="px-4 py-2.5 font-medium">Title</th>
            <th className="px-4 py-2.5 font-medium">Findings</th>
            <th className="px-4 py-2.5 font-medium">Model</th>
            <th className="px-4 py-2.5 font-medium">Duration</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-zinc-900/40">
              <td className="max-w-96 px-4 py-2.5">
                <Link
                  href={`/history/${row.id}`}
                  className="font-medium text-emerald-400 hover:underline"
                >
                  {row.title}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-zinc-400">{row.findingCount}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{row.model}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">
                {(row.durationMs / 1000).toFixed(1)}s
              </td>
              <td className="px-4 py-2.5 text-zinc-400">
                {row.createdAt.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
