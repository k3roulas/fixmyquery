'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError((body as { error?: string } | null)?.error ?? 'Sign in failed');
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next');
      const safe = next?.startsWith('/') === true && !next.startsWith('//') ? next : '/app';
      router.push(safe);
      router.refresh();
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md p-6">
      <h1 className="text-xl font-semibold text-zinc-100">Sign in</h1>
      <p className="mt-1 mb-4 text-sm text-zinc-500">
        Sign in to save analyses to your history and revisit them later.
      </p>

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-500">
        No account yet?{' '}
        <Link href="/register" className="text-emerald-400 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
