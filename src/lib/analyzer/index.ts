import type { Finding, ParsedPlan, RuleContext } from '../types';
import { runRules } from './rules';

export { computeMetrics, computeTotals, findNode, walk } from './metrics';

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function runDeterministicAnalysis(plan: ParsedPlan, sql: string): Finding[] {
  const ctx: RuleContext = { root: plan.root, totals: plan.totals, sql };
  return runRules(ctx).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
