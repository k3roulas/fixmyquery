# FixMyQuery — AI SQL Optimizer & Explain Plan Guide

## Context

Interview technical challenge (6–8h recommended budget, scored on: problem-solving, full-stack fundamentals, thoughtful AI use, code quality, explaining decisions, product/UX thinking). Deliverables: GitHub repo, README, and a live or recorded (Loom) demo.

**Product:** Anyone can paste a slow Postgres query + its `EXPLAIN (ANALYZE, BUFFERS)` output. The app parses the plan, runs **deterministic bottleneck-detection rules**, then a **reasoning LLM grounded in those measured facts** explains the bottlenecks in plain English and proposes optimized SQL + index DDL. Results render as an interactive plan tree + findings. **Registered users** get their analyses persisted to history; **anonymous users can use everything except persistence**.

**Core technical story (the differentiator vs EverSQL/pgMustard/explain.dalibo.com):** hybrid pipeline — deterministic facts ground the LLM (anti-hallucination), and the LLM's SQL rewrite is syntax-validated with a real parser before display (trust-but-verify).

## Tooling conventions (mirrored from `../just`)

- **pnpm** as package manager.
- **Biome 2.x** for format + lint (no ESLint): spaces/2, width 100, LF, single quotes, semicolons always, trailing commas es5, organize-imports assist on. `drizzle/` migrations excluded from formatting.
- **Strict TS** beyond defaults: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`.
- **Vitest** (`vitest run` + `test:watch`).
- **Scripts:** `dev`, `build`, `start`, `typecheck`, `check`, `check:fix`, `test`, `test:watch`, `db:up`, `db:generate`, `db:migrate`.
- **Quality gate — before declaring any task complete:** `pnpm check:fix && pnpm typecheck` (+ `pnpm test`).
- **Never `git commit`/`git push` unless explicitly asked.**

## Decided constraints

- **Stack:** Next.js App Router + TypeScript + Tailwind. Layered: route handlers → `lib/` services → analyzers.
- **Persistence:** Postgres 17 in Docker + **Drizzle ORM** (drizzle-orm + `postgres.js`, drizzle-kit migrations).
- **Auth:** email+password registration with **email verification** through **Mailpit** (Docker mail catcher: SMTP :1025, web UI :8025). Session = JWT (`jose`) in HttpOnly cookie. Anonymous access fully allowed; only analysis *saving* requires a verified session.
- **AI:** **GLM-4.5-Flash** via Z.ai's OpenAI-compatible API (`baseURL https://api.z.ai/api/paas/v4/`, `openai` npm SDK). Chosen after a GLM-vs-DeepSeek comparison: free tier (zero-cost demo), official structured-output (JSON) support, native function calling, 128K context / 96K max output, hybrid reasoning. DeepSeek V4 Pro edges it on raw math reasoning but costs more and is flakier on JSON; provider is env-configurable, README presents the comparison as the model-choice rationale.
  - Env (provider-agnostic): `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (default `glm-4.5-flash`).
  - Thinking mode enabled via `extra_body: { thinking: { type: "enabled" } }`. CoT arrives in `reasoning_content` → "AI Reasoning" tab.
  - `response_format: { type: "json_object" }` + prompt contains "json" + example + `max_tokens: 12000`. Defensive parse/validate/retry kept as insurance (free tier is rate-limited → single-flight requests, one retry).
  - **Credentials verified 2026-09-01:** existing Z.ai key authenticates on the OpenAI endpoint; live test of `glm-4.5-flash` + `json_object` returned clean JSON `content` + thinking in `reasoning_content`.
- **Input:** paste-only UX (SQL + EXPLAIN output, text **or** JSON) + sample gallery of 5 seeded scenarios.
- **Tests:** Vitest, colocated `*.test.ts`.
- **Postgres plans only.**

## Architecture / data flow

```
docker compose up -d            # postgres :5432 + mailpit :1025 (SMTP) / :8025 (UI)

Paste SQL + plan (or pick sample)      [anonymous + logged-in]
→ POST /api/analyze { sql, explainInput, title? }
  1. detectFormat(explainInput)                       "json" | "text"
  2. parseExplain → normalized PlanNode tree + totals
  3. computeMetrics: per-node inclusive time, % share, est-vs-actual ratio
  4. runDeterministicAnalysis → Finding[]
  5. analyzeWithAI:
       buildPrompt(sql, compact node outline, findings)   ← grounding
       → GLM chat.completions (glm-4.5-flash, thinking on, json_object)
       → defensive parse (empty-content guard, extract {...} substring)
       → Zod safeParse → on failure ONE retry with validation error appended
       → node-sql-parser syntax-check each optimized SQL variant → syntaxOk flag
  6. AI still invalid → degraded mode: deterministic findings + aiError
  7. If session (verified user) → drizzle insert Analysis → DTO.saved = true
     If anonymous → skip persist → DTO.saved = false (+ UI hint)
→ ResultsView tabs: Plan Tree | Bottlenecks | Optimized SQL | Indexes | AI Reasoning

Auth flow (phase 4):
  POST /api/auth/register → scrypt hash, unverified user, verification token
      (sha256-stored, 24h, single-use) → nodemailer → Mailpit → click /verify?token=…
  POST /api/auth/login   → JWT session cookie (HttpOnly, 7d)
  /history (server)      → redirect to /login when no session
```

Failure isolation: analysis stages 1–4 are deterministic and never fail the request; only the AI stage can fail, and it fails soft. Auth never gates analysis — only persistence.

## File tree

```
src/app/
├── layout.tsx                  # nav: Analyze / History / Sign in / Register
├── page.tsx                    # workspace (Workspace.tsx client) — public
├── login/ register/ verify/    # auth pages (phase 4)
├── history/page.tsx            # session required (phase 5)
├── history/[id]/page.tsx       # replay saved analysis (phase 5)
└── api/
    ├── analyze/route.ts        # POST: pipeline → persist-if-session → DTO
    └── auth/{register,login,logout,verify}/route.ts   # phase 4
src/components/
├── Workspace.tsx  AnalyzeForm.tsx  ResultsView.tsx
├── PlanTree.tsx  PlanNodeCard.tsx  NodeDetailPanel.tsx
├── BottleneckList.tsx  SqlBlock.tsx  SqlCompare.tsx (cut candidate)
├── IndexSuggestions.tsx  AiSummary.tsx  ErrorBanner.tsx
├── SaveHint.tsx  HistoryTable.tsx
src/lib/
├── types.ts            # PlanNode, Finding, AiResult, AnalysisDTO
├── parser/             # explainJson, explainText, detectFormat, index
├── analyzer/           # metrics, rules/ (7), index
├── ai/                 # client, prompt, schema, parse, analyzeWithAI
├── validate/sqlCheck.ts
├── auth/               # password (scrypt), tokens, session (jose), mailer
├── db/                 # drizzle client + schema
├── samples.ts          # 5 scenarios
└── analysis-service.ts # runAnalysis() shared by API route
```

## PlanNode (normalized by both parsers)

```ts
type PlanNode = {
  id: string;                 // "n0"… stable → AI grounding + tree highlight
  nodeType: string;           // "Seq Scan" | "Nested Loop" | "Sort"…
  relation?: string; indexName?: string;
  actualLoops: number; actualTimeMs: number;   // Actual Total Time
  estRows: number; actualRows: number;         // per-loop avg
  filter?: string;
  sortMethod?, sortSpaceUsed?, sortSpaceType?;
  sharedHitBlocks?, sharedReadBlocks?, tempReadBlocks?, tempWrittenBlocks?;
  rowsRemovedByFilter?: number;
  children: PlanNode[];
  raw?: Record<string, unknown>;
};
```

Text parser: indent-stack tree build; per-line regex for cost/rows/actual; attribute lines (`Filter:`, `Sort Method:`, `Buffers:`, `Rows Removed by Filter:`, `Hash Batches:`) attach to current node. JSON is the primary format; text supported + tested but secondary.

## Deterministic rules (~7)

1. **seqScanOnLargeTable** — Seq Scan where `rowsRemovedByFilter + actualRows×loops > 10k` and time share > 20% → index on filter columns.
2. **cardinalityMismatch** — `actualRows / max(estRows,1)` > 100 (or < 0.01 w/ actualRows > 1k) → ANALYZE / more selective predicates.
3. **nestedLoopHighLoops** — Nested Loop whose inner child has `loops > 1000` at > 10% total time → hash join / join-key index.
4. **sortSpillToDisk** — Sort with `external merge …kB` or temp blocks written → work_mem / reduce rows / ORDER BY index.
5. **hashSpillToDisk** — Hash node with `Batches > 1` or temp written blocks → work_mem / smaller build side.
6. **nonSargableFilter** — regex on filter/SQL: `LIKE '%…'`, `LOWER(col)`, `date_trunc(…, col)` → pg_trgm GIN or rewrite.
7. **largeOffset** — SQL regex `OFFSET (\d+)` ≥ 10k → keyset pagination.

Finding: `{ ruleId, nodeId, severity, title, evidence (with numbers), suggestion }`.
Prompt compaction: one-line-per-node outline + findings JSON + totals (~1–2k tokens).

## AI JSON contract (Zod)

```ts
Bottleneck  = { nodeId?, title, severity, explanation, fix }
IndexSug    = { name, ddl, reason }
SqlVariant  = { label, sql, rationale }
AiResult    = { summary, bottlenecks[≥1], optimized_sql[≥1], proposed_indexes[], caveats }
```

Parse chain: empty-content guard → strip `<think>` → extract `{…}` → JSON.parse → Zod → one retry with the Zod error → else degraded mode. `reasoning_content` truncated ~4k chars → persisted → UI collapsible.

## Drizzle schema

`users` (id uuid, email unique, passwordHash, emailVerifiedAt, createdAt) ·
`verification_tokens` (userId fk cascade, tokenHash unique, expiresAt, consumedAt) ·
`analyses` (userId fk cascade, title, sql, explainInput, explainFormat, planJson jsonb, deterministicFindings jsonb, aiResult jsonb null, reasoning, model, durationMs, createdAt)

## Sample scenarios (`lib/samples.ts`)

1. Missing index on `orders.customer_id` — Seq Scan discards 499k/500k rows, 380ms.
2. Leading-wildcard `LIKE '%phone%'` on `products.name` — Seq Scan 200k rows, 610ms.
3. `ORDER BY created_at DESC LIMIT 50 OFFSET 50000` on events — 2.4s → keyset pagination.
4. Join cardinality explosion — est 100 vs actual 480k → Nested Loop inner loops=480k, 5.9s.
5. Sort spilling to disk — `external merge 24500kB`, Hash Batches 64, 8.2s.

Each: `{ id, title, blurb, ddl, sql, explainJson, explainText }` — JSON written first, text derived from the same numbers.

## Tests

Parser specs (text nesting/attributes, JSON nesting) · metrics (% share math) · per-rule positive/negative/severity · AI parse chain (think-strip, fenced/bare JSON, garbage → typed error, Zod accept/reject) · sqlCheck · auth primitives (scrypt, token logic, JWT) · **samples sanity: every sample parses in BOTH formats and yields ≥ 1 finding.**

## Build order

| Phase | Time | Scope |
|---|---|---|
| 0 | 1h | Scaffold: Next.js + pnpm + Biome + strict TS + Vitest + docker-compose (pg+mailpit) + drizzle migration |
| 1 | 2h | Parser + analyzer core + all rule tests |
| 2 | 1.5h | /api/analyze + workspace UI (tree + findings + sample gallery), no AI |
| 3 | 1.5h | GLM: client, prompt, schema, parse/retry, sqlCheck, degraded mode |
| 4 | 1.5h | Auth: register/verify/login/logout + Mailpit + JWT session |
| 5 | 0.75h | Persistence wiring: save-if-session, SaveHint, history pages |
| 6 | 1h | Polish + README + smoke all 5 samples |

**Cut order if behind:** SqlCompare → auth tests → history detail page → reasoning display. **Never cut:** parser tests, degraded mode, auth happy path, README.

## Verification

1. `pnpm check` + `pnpm typecheck` clean; `pnpm test` green.
2. `docker compose up -d` → postgres healthy, Mailpit UI at :8025.
3. Anonymous: all 5 samples render tree highlights, bottlenecks, optimized SQL (syntaxOk), indexes, reasoning.
4. Auth: register → Mailpit email → verify → login → analysis saved → history survives reload; cross-user access blocked.
5. Degraded: unset `AI_API_KEY` → deterministic findings still render with a friendly banner.
6. Text-format plans produce the same findings as JSON.
7. README setup runs from a clean clone.
