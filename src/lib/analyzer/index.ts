import type { Finding, ParsedPlan, RuleContext } from '../types';
import { runRules } from './rules';

export { computeMetrics, computeTotals, findNode, walk } from './metrics';

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

// The non-AI half of analysis: runs every heuristic rule (seq scan on a large
// table, hash/sort spill to disk, non-SARGable filters, …) against the plan
// and returns the findings sorted high → low severity. Same plan in, same
// findings out — unlike the AI stage, which is advisory and can fail.
export function runDeterministicAnalysis(plan: ParsedPlan, sql: string): Finding[] {
  const ctx: RuleContext = { root: plan.root, totals: plan.totals, sql };
  const findings = runRules(ctx);
  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
