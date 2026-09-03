import { describe, expect, it } from 'vitest';

import { AiParseError, parseAiContent } from './parse';

const VALID = JSON.stringify({
  summary: 'The seq scan dominates.',
  bottlenecks: [
    {
      nodeId: 'n2',
      title: 'Seq scan on orders',
      severity: 'high',
      explanation: 'It reads 500k rows.',
      fix: 'Add an index.',
    },
  ],
  optimized_sql: [{ label: 'indexed', sql: 'SELECT 1', rationale: 'uses the index' }],
  proposed_indexes: [],
  caveats: '',
});

describe('parseAiContent', () => {
  it('accepts bare json', () => {
    const { data } = parseAiContent(VALID);
    expect(data.summary).toBe('The seq scan dominates.');
  });

  it('strips <think> blocks around the json', () => {
    const wrapped = `<think>let me reason about this plan...</think>${VALID}`;
    const { data } = parseAiContent(wrapped);
    expect(data.bottlenecks[0]?.nodeId).toBe('n2');
  });

  it('strips markdown fences', () => {
    const fenced = `\`\`\`json\n${VALID}\n\`\`\``;
    const { data } = parseAiContent(fenced);
    expect(data.optimized_sql).toHaveLength(1);
  });

  it('extracts json embedded in prose', () => {
    const noisy = `Here is my analysis:\n${VALID}\nHope this helps!`;
    const { data } = parseAiContent(noisy);
    expect(data.summary).toBe('The seq scan dominates.');
  });

  it('fills defaults for optional fields', () => {
    const minimal = JSON.stringify({
      summary: 's',
      bottlenecks: [{ title: 't', severity: 'low', explanation: 'e', fix: 'f' }],
      optimized_sql: [{ label: 'l', sql: 'SELECT 1', rationale: 'r' }],
    });
    const { data } = parseAiContent(minimal);
    expect(data.proposed_indexes).toEqual([]);
    expect(data.caveats).toBe('');
  });

  it('rejects empty content', () => {
    try {
      parseAiContent('   ');
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AiParseError);
      expect((err as AiParseError).failure.kind).toBe('empty');
    }
  });

  it('rejects content with no json object', () => {
    try {
      parseAiContent('the query is fine, no changes needed');
      expect.unreachable('should throw');
    } catch (err) {
      expect((err as AiParseError).failure.kind).toBe('no-json');
    }
  });

  it('rejects malformed json', () => {
    try {
      parseAiContent('{ summary: "oops" }');
      expect.unreachable('should throw');
    } catch (err) {
      expect((err as AiParseError).failure.kind).toBe('invalid-json');
    }
  });

  it('reports schema violations', () => {
    const bad = JSON.stringify({ summary: 's', bottlenecks: [], optimized_sql: [] });
    try {
      parseAiContent(bad);
      expect.unreachable('should throw');
    } catch (err) {
      const failure = (err as AiParseError).failure;
      expect(failure.kind).toBe('schema');
      if (failure.kind === 'schema') {
        expect(failure.error).toContain('bottlenecks');
      }
    }
  });

  it('rejects unknown severity values', () => {
    const bad = JSON.stringify({
      summary: 's',
      bottlenecks: [{ title: 't', severity: 'critical', explanation: 'e', fix: 'f' }],
      optimized_sql: [{ label: 'l', sql: 'SELECT 1', rationale: 'r' }],
    });
    try {
      parseAiContent(bad);
      expect.unreachable('should throw');
    } catch (err) {
      expect((err as AiParseError).failure.kind).toBe('schema');
    }
  });
});
