import type { Finding, Rule } from '../../types';
import { walk } from '../metrics';

// Seq Scans are fine on small tables — this only fires when one processes
// >10k rows AND burns >20% of query time; severity jumps to high past 50%.
// "Processed" counts both matched rows and rows discarded by the filter.
export const seqScanOnLargeTable: Rule = ({ root }) => {
  const findings: Finding[] = [];
  for (const node of walk(root)) {
    if (node.nodeType !== 'Seq Scan') continue;
    const processed = (node.rowsRemovedByFilter ?? 0) + node.actualRows * node.actualLoops;
    if (processed <= 10_000 || node.timeSharePct <= 20) continue;
    const severity = node.timeSharePct > 50 ? 'high' : 'medium';
    findings.push({
      ruleId: 'seq-scan-large-table',
      nodeId: node.id,
      severity,
      title: `Sequential scan on ${node.relation ?? 'table'} reads ${processed.toLocaleString()} rows`,
      evidence: `Seq Scan processed ${processed.toLocaleString()} rows in total (${node.actualRows.toLocaleString()} matched, ${(node.rowsRemovedByFilter ?? 0).toLocaleString()} removed by filter) and consumed ~${node.inclusiveMs.toFixed(0)}ms (${node.timeSharePct.toFixed(0)}% of query time).`,
      suggestion: node.filter
        ? `Create a B-tree index on the filter column(s) — the filter is: ${node.filter}.`
        : 'Create an index matching the predicates used by this scan, or reduce the rows scanned.',
    });
  }
  return findings;
};
