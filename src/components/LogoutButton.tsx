'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BASE_PATH } from '@/lib/api-client';

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`${BASE_PATH}/api/auth/logout`, { method: 'POST' });
      router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="cursor-pointer text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-default"
    >
      Logout
    </button>
  );
}
