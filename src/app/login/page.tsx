'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { inputClass } from '@/components/ui/styles';
import { postJson } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';

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
    const res = await postJson('/api/auth/login', { email, password }, 'Sign in failed');
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get('next');
    const safe = next?.startsWith('/') === true && !next.startsWith('//') ? next : ROUTES.app;
    router.push(safe);
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-md p-6">
      <h1 className="text-xl font-semibold text-zinc-100">Sign in</h1>
      <p className="mt-1 mb-4 text-sm text-zinc-500">
        Sign in to save analyses to your history and revisit them later.
      </p>

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} />
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
            className={inputClass}
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
            className={inputClass}
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
        <Link href={ROUTES.register} className="text-emerald-400 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
