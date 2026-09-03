import { analyzeWithAI } from '@/lib/ai/analyzeWithAI';
import { runDeterministicAnalysis } from '@/lib/analyzer';
import { parseExplain } from '@/lib/parser';
import type { AnalysisResult, ParsedPlan } from '@/lib/types';

export class ParseError extends Error {}

// Titles the analysis in history lists when the user didn't provide one:
// first non-empty SQL line, whitespace collapsed, capped at 80 chars so
// history rows stay scannable.
function deriveTitle(sql: string): string {
  const firstLine = sql
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return 'Untitled analysis';
  const compact = firstLine.replace(/\s+/g, ' ');
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

export async function runAnalysis(input: {
  sql: string;
  explainInput: string;
  title?: string | undefined;
}): Promise<AnalysisResult> {
  const startedAt = Date.now();

  let parsed: ParsedPlan;
  try {
    parsed = parseExplain(input.explainInput);
  } catch (err) {
    throw new ParseError(err instanceof Error ? err.message : 'Could not parse the EXPLAIN output');
  }

  const findings = runDeterministicAnalysis(parsed, input.sql);

  const aiStage = await analyzeWithAI({ sql: input.sql, plan: parsed, findings });

  return {
    title: input.title?.trim() || deriveTitle(input.sql),
    sql: input.sql,
    explainInput: input.explainInput,
    explainFormat: parsed.format,
    root: parsed.root,
    totals: parsed.totals,
    findings,
    ai: aiStage.ai,
    aiError: aiStage.aiError,
    reasoning: aiStage.reasoning,
    model: aiStage.model,
    durationMs: Date.now() - startedAt,
    saved: false,
  };
}
