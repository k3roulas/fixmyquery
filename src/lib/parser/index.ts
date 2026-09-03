import { computeMetrics, computeTotals } from '../analyzer/metrics';
import type { ParsedPlan } from '../types';
import { detectFormat } from './detectFormat';
import { parseExplainJson } from './explainJson';
import { parseExplainText } from './explainText';

export { detectFormat, parseExplainJson, parseExplainText };

export function parseExplain(input: string): ParsedPlan {
  const format = detectFormat(input);
  const parsed = format === 'json' ? parseExplainJson(input) : parseExplainText(input);
  const totals = computeTotals(parsed.root, parsed.planningMs, parsed.executionMs);
  computeMetrics(parsed.root, totals);
  return { format, root: parsed.root, totals };
}
