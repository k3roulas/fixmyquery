import type { ExplainFormat } from '../types';

export function detectFormat(input: string): ExplainFormat {
  const trimmed = input.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    return 'text';
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) {
      return 'json';
    }
  } catch {
    return 'text';
  }
  return 'text';
}
