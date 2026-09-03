import Link from 'next/link';
import FeatureCard from '@/components/marketing/FeatureCard';
import ScreenshotPlaceholder from '@/components/marketing/ScreenshotPlaceholder';
import { getSession } from '@/lib/auth/session';

export default async function MarketingPage() {
  const session = await getSession();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-12 sm:px-6 sm:py-16">
      <section className="space-y-6 text-center">
        <p className="font-mono text-xs tracking-wide text-emerald-400">
          explain plan → diagnosis → fix
        </p>
        <h1 className="mx-auto max-w-2xl text-3xl font-bold text-zinc-100 sm:text-4xl">
          Paste a slow Postgres query. Get the bottleneck and the fix.
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          FixMyQuery runs deterministic rules over your EXPLAIN plan in milliseconds — then a
          grounded AI review explains what the numbers mean, rewrites the query, and proposes the
          indexes that justify one.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {session ? (
            <Link
              href="/app"
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Open the app
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Create an account
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-emerald-600 hover:text-emerald-400"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
        <ScreenshotPlaceholder caption="Plan tree with bottleneck highlights" />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">What you get</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard
            glyph="01"
            title="Deterministic plan rules"
            description="Scans, joins, spills, estimate errors and deep OFFSETs are found by rules against the plan's own numbers — instantly, with no hallucination."
          />
          <FeatureCard
            glyph="02"
            title="Grounded AI review"
            description="The AI sees the plan and the rule findings, explains each bottleneck in plain language, and flags what the rules can't see."
          />
          <FeatureCard
            glyph="03"
            title="Query rewrites & indexes"
            description="Optimized SQL variants — syntax-checked before you see them — plus CREATE INDEX DDL with the reasoning behind each proposal."
          />
          <FeatureCard
            glyph="04"
            title="Saved history"
            description="Every analysis is saved to your account. Replay the full plan tree, findings and AI review anytime."
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <ScreenshotPlaceholder caption="Optimized SQL variants" />
        <ScreenshotPlaceholder caption="Proposed indexes with DDL" />
      </section>
    </div>
  );
}
