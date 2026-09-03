'use client';

import Link from 'next/link';
import { useState } from 'react';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { inputClass } from '@/components/ui/styles';
import { postJson } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await postJson('/api/auth/register', { email, password }, 'Registration failed');
    if (res.ok) {
      setDone(true);
    } else {
      setError(res.error);
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md p-6">
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-6 text-center">
          <h1 className="text-lg font-semibold text-emerald-300">Check your email</h1>
          <p className="mt-2 text-sm text-zinc-300">
            We sent a verification link to <span className="font-mono">{email}</span>. Click it to
            activate your account, then sign in.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            In local development, open the{' '}
            <a
              href="http://localhost:8025"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              Mailpit inbox at :8025
            </a>{' '}
            to find the email.
          </p>
          <Link
            href={ROUTES.login}
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md p-6">
      <h1 className="text-xl font-semibold text-zinc-100">Create an account</h1>
      <p className="mt-1 mb-4 text-sm text-zinc-500">
        Registering lets you keep a history of your analyses. Analyzing queries works without an
        account.
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-600">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-zinc-300">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {busy ? 'Creating…' : 'Register'}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-500">
        Already registered?{' '}
        <Link href={ROUTES.login} className="text-emerald-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
