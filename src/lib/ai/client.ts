import OpenAI from 'openai';

export const AI_MODEL = process.env.AI_MODEL ?? 'glm-4.5-flash';

// 'disabled' skips the model's CoT pass (~3x faster, no reasoning_content to show).
export const AI_THINKING: 'enabled' | 'disabled' =
  process.env.AI_THINKING === 'disabled' ? 'disabled' : 'enabled';

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export function getAiClient(): OpenAI {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI_API_KEY is not configured');
  }
  return new OpenAI({
    baseURL: process.env.AI_BASE_URL ?? 'https://api.z.ai/api/paas/v4/',
    apiKey,
    timeout: 180_000,
    maxRetries: 0,
  });
}
