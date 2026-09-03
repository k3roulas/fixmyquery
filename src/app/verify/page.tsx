'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'pending' | 'ok' | 'error' | 'missing'>('pending');
  const [message, setMessage] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setState('missing');
      return;
    }
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const body = await res.json().catch(() => null);
        if (res.ok) {
          setState('ok');
          setMessage((body as { message?: string } | null)?.message ?? 'Email verified');
        } else {
          setState('error');
          setMessage((body as { error?: string } | null)?.error ?? 'Verification failed');
        }
      } catch {
        setState('error');
        setMessage('Network error — is the server running?');
      }
    })();
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-md p-6">
      <div
        className={`rounded-xl border p-6 text-center ${
          state === 'ok'
            ? 'border-emerald-900/60 bg-emerald-950/20'
            : state === 'pending'
              ? 'border-zinc-800 bg-zinc-900/40'
              : 'border-red-900/60 bg-red-950/30'
        }`}
      >
        <h1 className="text-lg font-semibold text-zinc-100">
          {state === 'pending'
            ? 'Verifying your email…'
            : state === 'ok'
              ? 'Email verified'
              : state === 'missing'
                ? 'Missing token'
                : 'Verification failed'}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {state === 'pending' ? 'One moment.' : message}
        </p>
        {state === 'ok' ? (
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Sign in
          </Link>
        ) : null}
        {state !== 'ok' && state !== 'pending' ? (
          <Link
            href="/register"
            className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
          >
            Back to registration
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-center text-sm text-zinc-500">Loading verification…</div>}
    >
      <VerifyInner />
    </Suspense>
  );
}
