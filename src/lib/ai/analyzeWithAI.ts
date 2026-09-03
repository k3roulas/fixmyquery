import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import type { AiResult, Finding, ParsedPlan, SqlVariant } from '@/lib/types';
import { checkSqlSyntax } from '@/lib/validate/sqlCheck';

import { AI_MODEL, AI_THINKING, getAiClient, isAiConfigured } from './client';
import { AiParseError, parseAiContent } from './parse';
import { buildMessages } from './prompt';
import type { AiWire } from './schema';

const MAX_RETRIES = 1;
const MAX_REASONING_CHARS = 4000;

export interface AiStageResult {
  ai: AiResult | null;
  aiError: string | null;
  reasoning: string | null;
  model: string;
}

interface RawCompletion {
  content: string;
  reasoning: string | null;
}

async function callModel(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<RawCompletion> {
  const client = getAiClient();
  const params = {
    model: AI_MODEL,
    messages,
    response_format: { type: 'json_object' },
    max_tokens: 12_000,
  };
  const res = await client.chat.completions.create({
    ...params,
    // Z.ai-specific passthrough (not in the OpenAI SDK types); serializes into the request body.
    thinking: { type: AI_THINKING },
  } as ChatCompletionCreateParamsNonStreaming);
  const message = res.choices[0]?.message;
  const reasoning = (message as { reasoning_content?: unknown } | undefined)?.reasoning_content;
  return {
    content: typeof message?.content === 'string' ? message.content : '',
    reasoning: typeof reasoning === 'string' ? reasoning : null,
  };
}

function toAiResult(wire: AiWire): AiResult {
  const variants: SqlVariant[] = wire.optimized_sql.map((v) => {
    const check = checkSqlSyntax(v.sql);
    return check.syntaxOk
      ? { label: v.label, sql: v.sql, rationale: v.rationale, syntaxOk: true }
      : {
          label: v.label,
          sql: v.sql,
          rationale: v.rationale,
          syntaxOk: false,
          syntaxError: check.syntaxError,
        };
  });

  return {
    summary: wire.summary,
    bottlenecks: wire.bottlenecks,
    optimized_sql: variants,
    proposed_indexes: wire.proposed_indexes,
    caveats: wire.caveats,
  };
}

export async function analyzeWithAI(input: {
  sql: string;
  plan: ParsedPlan;
  findings: Finding[];
}): Promise<AiStageResult> {
  if (!isAiConfigured()) {
    return {
      ai: null,
      aiError:
        'AI review is disabled: AI_API_KEY is not configured. Showing deterministic findings only.',
      reasoning: null,
      model: 'none',
    };
  }

  const baseMessages = buildMessages(input);

  try {
    let completion: RawCompletion | null = null;
    let lastParseError: AiParseError | null = null;
    let wire: AiWire | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        ...baseMessages,
      ];
      if (attempt > 0 && completion && lastParseError) {
        messages.push({ role: 'assistant', content: completion.content || '(empty response)' });
        messages.push({
          role: 'user',
          content: `Your previous response failed validation: ${lastParseError.message}. Respond again with ONLY the corrected json object matching the required shape.`,
        });
      }

      completion = await callModel(messages);
      try {
        wire = parseAiContent(completion.content).data;
        break;
      } catch (err) {
        if (err instanceof AiParseError) {
          lastParseError = err;
          continue;
        }
        throw err;
      }
    }

    if (!wire) {
      return {
        ai: null,
        aiError: `AI response failed validation twice: ${lastParseError?.message ?? 'unknown error'}. Showing deterministic findings only.`,
        reasoning: completion?.reasoning?.slice(0, MAX_REASONING_CHARS) ?? null,
        model: AI_MODEL,
      };
    }

    return {
      ai: toAiResult(wire),
      aiError: null,
      reasoning: completion?.reasoning?.slice(0, MAX_REASONING_CHARS) ?? null,
      model: AI_MODEL,
    };
  } catch (err) {
    const status = err instanceof OpenAI.APIError ? err.status : undefined;
    const detail = err instanceof Error ? err.message : 'unknown error';
    return {
      ai: null,
      aiError: `AI request failed${status ? ` (HTTP ${status})` : ''}: ${detail}. Showing deterministic findings only.`,
      reasoning: null,
      model: AI_MODEL,
    };
  }
}
