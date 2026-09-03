import type { Finding, PlanNode, PlanTotals } from '../../types';
import { walk } from '../metrics';

export function cardinalityMismatch(root: PlanNode, _totals: PlanTotals): Finding[] {
  const findings: Finding[] = [];
  for (const node of walk(root)) {
    if (node.estRows === 0 && node.actualRows === 0) continue;
    const ratio = node.actualRows / Math.max(node.estRows, 1);
    const overEstimated = node.estRows > 1000 && node.actualRows > 0 && ratio < 0.01;
    const underEstimated = node.actualRows > 100 && ratio > 100;
    if (!overEstimated && !underEstimated) continue;
    const factor = underEstimated ? ratio : 1 / ratio;
    findings.push({
      ruleId: 'cardinality-mismatch',
      nodeId: node.id,
      severity: 'high',
      title: `${node.nodeType} row estimate is off by ~${Math.round(factor)}x`,
      evidence: `Planner estimated ${node.estRows.toLocaleString()} rows but the node actually returned ${node.actualRows.toLocaleString()} rows per loop (${node.actualLoops.toLocaleString()} loop(s)). Bad estimates cascade into wrong join strategies and memory sizing.`,
      suggestion:
        'Run ANALYZE on the involved tables to refresh statistics. If the estimate is still off, the predicate may need extended statistics (CREATE STATISTICS) or the query rewritten so the planner can estimate it.',
    });
  }
  return findings;
}
