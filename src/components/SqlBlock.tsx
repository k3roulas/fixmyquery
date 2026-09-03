'use client';

import { useState } from 'react';

export default function SqlBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context) — copy is best-effort
    }
  }

  return (
    <div className="group relative rounded-lg border border-zinc-800 bg-zinc-950">
      {label ? (
        <div className="border-b border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400">
          {label}
        </div>
      ) : null}
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-zinc-200 whitespace-pre">
        {code}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-200 focus:opacity-100"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
