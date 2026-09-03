import type { z } from 'zod';

import { AiWireSchema } from './schema';

export type AiParseFailure =
  | { kind: 'empty' }
  | { kind: 'no-json' }
  | { kind: 'invalid-json'; error: string }
  | { kind: 'schema'; error: string };

export class AiParseError extends Error {
  readonly failure: AiParseFailure;

  constructor(failure: AiParseFailure) {
    super(describeFailure(failure));
    this.failure = failure;
  }
}

function describeFailure(f: AiParseFailure): string {
  switch (f.kind) {
    case 'empty':
      return 'Model returned an empty response';
    case 'no-json':
      return 'Model response contained no JSON object';
    case 'invalid-json':
      return `Model response was not valid JSON: ${f.error}`;
    case 'schema':
      return `Model JSON failed schema validation: ${f.error}`;
  }
}

export function parseAiContent(content: string): { data: z.infer<typeof AiWireSchema> } {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new AiParseError({ kind: 'empty' });
  }

  let cleaned = trimmed.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');

  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new AiParseError({ kind: 'no-json' });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned.slice(first, last + 1));
  } catch (err) {
    throw new AiParseError({
      kind: 'invalid-json',
      error: err instanceof Error ? err.message : 'unknown JSON error',
    });
  }

  const result = AiWireSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new AiParseError({
      kind: 'schema',
      error: result.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; '),
    });
  }

  return { data: result.data };
}
