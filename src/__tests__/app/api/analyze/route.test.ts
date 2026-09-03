import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '@/lib/types';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));
vi.mock('@/lib/analysis-service', () => ({
  ParseError: class ParseError extends Error {},
  runAnalysis: vi.fn(),
}));
vi.mock('@/lib/history-service', () => ({
  saveAnalysis: vi.fn(),
}));

import { POST } from '@/app/api/analyze/route';
import { runAnalysis } from '@/lib/analysis-service';
import { getSession } from '@/lib/auth/session';
import { saveAnalysis } from '@/lib/history-service';

const mockedGetSession = vi.mocked(getSession);
const mockedRunAnalysis = vi.mocked(runAnalysis);
const mockedSaveAnalysis = vi.mocked(saveAnalysis);

function stubResult(): AnalysisResult {
  return {
    title: 'select 1',
    sql: 'select 1',
    explainInput: ' Seq Scan on t  (cost=0.00..1.01 rows=1 width=4)',
    explainFormat: 'text',
    root: {
      id: 'n0',
      nodeType: 'Seq Scan',
      actualLoops: 1,
      actualTimeMs: 0.1,
      estRows: 1,
      actualRows: 1,
      inclusiveMs: 0.1,
      timeSharePct: 100,
      children: [],
    },
    totals: {
      executionMs: 0.2,
      planningMs: 0.1,
      sharedHitBlocks: 1,
      sharedReadBlocks: 0,
      tempReadBlocks: 0,
      tempWrittenBlocks: 0,
      nodeCount: 1,
    },
    findings: [],
    ai: null,
    aiError: null,
    reasoning: null,
    model: 'test-model',
    durationMs: 42,
    saved: false,
  };
}

function request(body: unknown): Request {
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validBody = { sql: 'select 1', explainInput: ' Seq Scan on t' };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/analyze', () => {
  it('rejects unauthenticated requests with 401', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await POST(request(validBody));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Sign in required' });
    expect(mockedRunAnalysis).not.toHaveBeenCalled();
    expect(mockedSaveAnalysis).not.toHaveBeenCalled();
  });

  it('rejects an invalid JSON body with 400', async () => {
    mockedGetSession.mockResolvedValue({ userId: 'u1', email: 'a@b.c' });

    const res = await POST(request('not json'));

    expect(res.status).toBe(400);
  });

  it('rejects invalid input with 400', async () => {
    mockedGetSession.mockResolvedValue({ userId: 'u1', email: 'a@b.c' });

    const res = await POST(request({ sql: '', explainInput: 'x' }));

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('SQL query is required');
  });

  it('runs the analysis, saves it, and returns it flagged with its id', async () => {
    const session = { userId: 'u1', email: 'a@b.c' };
    const result = stubResult();
    mockedGetSession.mockResolvedValue(session);
    mockedRunAnalysis.mockResolvedValue(result);
    mockedSaveAnalysis.mockResolvedValue('abc123');

    const res = await POST(request(validBody));

    expect(res.status).toBe(200);
    expect(mockedSaveAnalysis).toHaveBeenCalledWith('u1', result);
    const body = (await res.json()) as AnalysisResult;
    expect(body.saved).toBe(true);
    expect(body.analysisId).toBe('abc123');
  });

  it('leaves the result unsaved when persistence fails', async () => {
    mockedGetSession.mockResolvedValue({ userId: 'u1', email: 'a@b.c' });
    mockedRunAnalysis.mockResolvedValue(stubResult());
    mockedSaveAnalysis.mockResolvedValue(null);

    const res = await POST(request(validBody));

    expect(res.status).toBe(200);
    const body = (await res.json()) as AnalysisResult;
    expect(body.saved).toBe(false);
    expect('analysisId' in body).toBe(false);
  });

  it('maps ParseError to 422', async () => {
    mockedGetSession.mockResolvedValue({ userId: 'u1', email: 'a@b.c' });
    const { ParseError } = await import('@/lib/analysis-service');
    mockedRunAnalysis.mockRejectedValue(new ParseError('bad plan'));

    const res = await POST(request(validBody));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('bad plan');
  });
});
