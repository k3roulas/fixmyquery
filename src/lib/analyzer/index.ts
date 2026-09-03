import type { Finding, ParsedPlan } from '../types';
import { cardinalityMismatch } from './rules/cardinalityMismatch';
import { hashSpillToDisk } from './rules/hashSpillToDisk';
import { largeOffset } from './rules/largeOffset';
import { nestedLoopHighLoops } from './rules/nestedLoopHighLoops';
import { nonSargableFilter } from './rules/nonSargableFilter';
import { seqScanOnLargeTable } from './rules/seqScanOnLargeTable';
import { sortSpillToDisk } from './rules/sortSpillToDisk';

export { computeMetrics, computeTotals, walk } from './metrics';

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function runDeterministicAnalysis(plan: ParsedPlan, sql: string): Finding[] {
  const { root, totals } = plan;
  const findings = [
    ...seqScanOnLargeTable(root, totals),
    ...cardinalityMismatch(root, totals),
    ...nestedLoopHighLoops(root, totals),
    ...sortSpillToDisk(root, totals),
    ...hashSpillToDisk(root, totals),
    ...nonSargableFilter(root, totals),
    ...largeOffset(sql),
  ];
  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
