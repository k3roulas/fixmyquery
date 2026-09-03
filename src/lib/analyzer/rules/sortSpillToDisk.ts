import type { Finding, Rule } from '../../types';
import { walk } from '../metrics';

// A sort that outgrew work_mem and swapped to temp files, detected via the
// "external merge" method or disk sort space. Severity escalates to high
// once the sort exceeds ~10MB.
export const sortSpillToDisk: Rule = ({ root }) => {
  const findings: Finding[] = [];
  for (const node of walk(root)) {
    const spilled =
      (node.sortSpaceType ?? '').toLowerCase() === 'disk' ||
      (node.sortMethod ?? '').includes('external merge');
    if (!spilled) continue;
    const kb = node.sortSpaceUsedKb ?? 0;
    findings.push({
      ruleId: 'sort-spill-to-disk',
      nodeId: node.id,
      severity: kb > 10_000 ? 'high' : 'medium',
      title: `Sort spilled to disk (${(kb / 1024).toFixed(1)}MB used)`,
      evidence: `Sort Method: ${node.sortMethod}, ${kb.toLocaleString()}kB — the sort did not fit in work_mem and swapped to temporary files (temp read: ${node.tempReadBlocks ?? 0} blocks, written: ${node.tempWrittenBlocks ?? 0} blocks).`,
      suggestion: node.sortKey
        ? `Raise work_mem for this query, reduce the rows entering the sort, or add an index matching the sort key (${node.sortKey}) so no sort is needed.`
        : 'Raise work_mem for this query or reduce the rows entering the sort.',
    });
  }
  return findings;
};
