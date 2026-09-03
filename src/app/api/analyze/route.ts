import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ParseError, runAnalysis } from '@/lib/analysis-service';
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AnalyzeInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  try {
    const result = await runAnalysis(parsed.data);

    const id = await saveAnalysis(session.userId, result);
    if (id) {
      result.saved = true;
      result.analysisId = id;
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ParseError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('analyze failed', err);
    return NextResponse.json({ error: 'Analysis failed unexpectedly' }, { status: 500 });
  }
}
