import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  AI_MODEL: 'test-model',
  AI_THINKING: 'disabled',
  getAiClient: vi.fn(),
  isAiConfigured: () => true,
}));

import { runDeterministicAnalysis } from '@/lib/analyzer';
import { parseExplain } from '@/lib/parser';
import { SAMPLES } from '@/lib/samples';

import { analyzeWithAI } from './analyzeWithAI';
import { getAiClient } from './client';

const mockedGetAiClient = vi.mocked(getAiClient);

interface FakeClient {
  calls: { role: string; content: string }[][];
  chat: {
    completions: {
      create: (params: { messages: { role: string; content: string }[] }) => Promise<unknown>;
    };
  };
}

function fakeClient(responses: string[]): FakeClient {
  const calls: FakeClient['calls'] = [];
  let i = 0;
  return {
    calls,
    chat: {
      completions: {
        create: async (params: { messages: { role: string; content: string }[] }) => {
          calls.push(params.messages);
          const content = responses[Math.min(i++, responses.length - 1)];
          return { choices: [{ message: { role: 'assistant', content } }] };
        },
      },
    },
  };
}

function wireJson(overrides: { proposedIndexes?: object[]; fix?: string }): string {
  return JSON.stringify({
    summary: 'Seq scan on orders dominates the query.',
    bottlenecks: [
      {
        nodeId: 'n2',
        title: 'Seq scan reads 500,000 rows',
        severity: 'high',
        explanation: 'Node n2 removes 499,500 rows by filter.',
        fix: overrides.fix ?? 'Create an index on (customer_id, created_at DESC).',
      },
    ],
    optimized_sql: [
      { label: 'unchanged', sql: 'SELECT 1;', rationale: 'The index alone fixes the plan.' },
    ],
    proposed_indexes: overrides.proposedIndexes ?? [
      {
        name: 'idx_orders_customer_created_desc',
        ddl: 'CREATE INDEX idx_orders_customer_created_desc ON orders (customer_id, created_at DESC);',
        reason: 'Serves the customer_id filter and the created_at DESC sort.',
      },
    ],
    caveats: '',
  });
}

const inconsistent = wireJson({ proposedIndexes: [] });
const consistent = wireJson({});

function sampleInput() {
  const sample = SAMPLES[0];
  if (!sample) throw new Error('SAMPLES[0] missing');
  const plan = parseExplain(sample.explainJson);
  return { sql: sample.sql, plan, findings: runDeterministicAnalysis(plan, sample.sql) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyzeWithAI index-consistency guardrail', () => {
  it('retries once when an index is recommended in prose but proposed_indexes is empty', async () => {
    const client = fakeClient([inconsistent, consistent]);
    mockedGetAiClient.mockReturnValue(client as unknown as ReturnType<typeof getAiClient>);

    const out = await analyzeWithAI(sampleInput());

    expect(client.calls.length).toBe(2);
    const correction = client.calls[1]?.at(-1);
    expect(correction?.role).toBe('user');
    expect(correction?.content).toContain('proposed_indexes is empty');
    expect(out.ai?.proposed_indexes.length).toBe(1);
    expect(out.aiError).toBeNull();
  });

  it('accepts the final attempt even if the inconsistency persists', async () => {
    const client = fakeClient([inconsistent, inconsistent]);
    mockedGetAiClient.mockReturnValue(client as unknown as ReturnType<typeof getAiClient>);

    const out = await analyzeWithAI(sampleInput());

    expect(client.calls.length).toBe(2);
    expect(out.ai).not.toBeNull();
    expect(out.ai?.proposed_indexes).toEqual([]);
    expect(out.aiError).toBeNull();
  });

  it('does not retry a consistent response', async () => {
    const client = fakeClient([consistent]);
    mockedGetAiClient.mockReturnValue(client as unknown as ReturnType<typeof getAiClient>);

    const out = await analyzeWithAI(sampleInput());

    expect(client.calls.length).toBe(1);
    expect(out.ai?.proposed_indexes.length).toBe(1);
  });

  it('allows an empty proposed_indexes when no index is recommended', async () => {
    const noIndex = wireJson({
      proposedIndexes: [],
      fix: 'Rewrite the query to avoid the self-join.',
    });
    const client = fakeClient([noIndex]);
    mockedGetAiClient.mockReturnValue(client as unknown as ReturnType<typeof getAiClient>);

    const out = await analyzeWithAI(sampleInput());

    expect(client.calls.length).toBe(1);
    expect(out.ai?.proposed_indexes).toEqual([]);
    expect(out.aiError).toBeNull();
  });
});
