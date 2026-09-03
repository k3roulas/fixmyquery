import type { Finding, PlanNode, PlanTotals } from '../../types';
import { walk } from '../metrics';

export function nestedLoopHighLoops(root: PlanNode, _totals: PlanTotals): Finding[] {
  const findings: Finding[] = [];
  for (const node of walk(root)) {
    if (node.nodeType !== 'Nested Loop') continue;
    for (const child of node.children) {
      if (child.actualLoops <= 1000 || child.timeSharePct <= 10) continue;
      findings.push({
        ruleId: 'nested-loop-high-loops',
        nodeId: node.id,
        severity: 'high',
        title: `Nested Loop re-executes its inner side ${child.actualLoops.toLocaleString()} times`,
        evidence: `The inner ${child.nodeType}${child.relation ? ` on ${child.relation}` : ''} ran ${child.actualLoops.toLocaleString()} times (once per outer row), costing ~${child.inclusiveMs.toFixed(0)}ms (${child.timeSharePct.toFixed(0)}% of query time). This pattern is O(outer × inner).`,
        suggestion:
          'If the inner side returns many rows per outer row, force a Hash Join (or enable_hashjoin) — or index the join key so each inner lookup is a cheap index probe.',
      });
    }
  }
  return findings;
}
