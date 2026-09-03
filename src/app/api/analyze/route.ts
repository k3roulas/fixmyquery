import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ParseError, runAnalysis } from '@/lib/analysis-service';
import { parseJsonBody } from '@/lib/api';
import { getSession } from '@/lib/auth/session';
import { saveAnalysis } from '@/lib/history-service';

const AnalyzeInput = z.object({
  sql: z.string().min(1, 'SQL query is required'),
  explainInput: z.string().min(1, 'EXPLAIN output is required'),
  title: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await parseJsonBody(req, AnalyzeInput);
  if (!body.ok) return body.response;

  try {
    const analysis = await runAnalysis(body.data);
    const stored = await saveAnalysis(session.userId, analysis);
    return NextResponse.json(stored);
  } catch (err) {
    if (err instanceof ParseError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('analyze failed', err);
    return NextResponse.json({ error: 'Analysis failed unexpectedly' }, { status: 500 });
  }
}
