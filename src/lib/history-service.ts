import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { analyses } from '@/lib/db/schema';
import type { AnalysisResult } from '@/lib/types';

export interface AnalysisRowSummary {
  id: string;
  title: string;
  sql: string;
  model: string;
  durationMs: number;
  findingCount: number;
  createdAt: Date;
}

export async function saveAnalysis(userId: string, result: AnalysisResult): Promise<string | null> {
  try {
    const [row] = await db
      .insert(analyses)
      .values({
        userId,
        title: result.title,
        sql: result.sql,
        explainInput: result.explainInput,
        explainFormat: result.explainFormat,
        planJson: { root: result.root, totals: result.totals },
        deterministicFindings: result.findings,
        aiResult: result.ai ?? undefined,
        reasoning: result.reasoning ?? undefined,
        model: result.model,
        durationMs: result.durationMs,
      })
      .returning({ id: analyses.id });
    return row?.id ?? null;
  } catch (err) {
    console.error('failed to persist analysis', err);
    return null;
  }
}

export async function listAnalyses(userId: string): Promise<AnalysisRowSummary[]> {
  const rows = await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt))
    .limit(100);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    sql: r.sql,
    model: r.model,
    durationMs: r.durationMs,
    findingCount: r.deterministicFindings.length,
    createdAt: r.createdAt,
  }));
}

export async function getAnalysis(id: string, userId: string): Promise<AnalysisResult | null> {
  const [row] = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.id, id), eq(analyses.userId, userId)))
    .limit(1);
  if (!row) return null;

  return {
    title: row.title,
    sql: row.sql,
    explainInput: row.explainInput,
    explainFormat: row.explainFormat,
    root: row.planJson.root,
    totals: row.planJson.totals,
    findings: row.deterministicFindings,
    ai: row.aiResult ?? null,
    aiError: null,
    reasoning: row.reasoning ?? null,
    model: row.model,
    durationMs: row.durationMs,
    saved: true,
    analysisId: row.id,
  };
}
