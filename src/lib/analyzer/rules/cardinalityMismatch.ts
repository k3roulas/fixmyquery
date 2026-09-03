import type { Finding, Rule } from '../../types';
import { walk } from '../metrics';

// Flags nodes where the planner's row estimate wildly diverges from reality:
// over-estimated (est > 1000 but <1% of actual) or under-estimated (actual
// > 100 and >100x the estimate). Bad estimates cascade — the planner picks
// join strategies and memory sizes based on them.
export const cardinalityMismatch: Rule = ({ root }) => {
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
};
