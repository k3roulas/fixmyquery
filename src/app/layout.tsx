import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { getSession } from '@/lib/auth/session';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FixMyQuery — AI SQL optimizer & explain plan guide',
  description:
    'Paste a slow Postgres query and its EXPLAIN plan. Deterministic rules find the bottlenecks; a grounded AI explains them and proposes fixes.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const session = await getSession();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-mono text-base font-bold text-emerald-400">FixMyQuery</span>
              <span className="hidden text-xs text-zinc-500 sm:inline">
                explain plan → diagnosis → fix
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-zinc-300 hover:text-emerald-400">
                Analyze
              </Link>
              {session ? (
                <>
                  <Link href="/history" className="text-zinc-300 hover:text-emerald-400">
                    History
                  </Link>
                  <span className="hidden max-w-48 truncate font-mono text-xs text-zinc-500 sm:inline">
                    {session.email}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="text-zinc-300 hover:text-emerald-400">
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500"
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
