import type { Finding, Rule } from '../../types';
import { walk } from '../metrics';

// Detects a Hash build side that didn't fit in work_mem: Postgres split it
// into batches (hashBatches > 1) or wrote temp blocks. Batched reads are far
// slower than one in-memory pass.
export const hashSpillToDisk: Rule = ({ root }) => {
  const findings: Finding[] = [];
  for (const node of walk(root)) {
    const spilled = (node.hashBatches ?? 1) > 1 || (node.tempWrittenBlocks ?? 0) > 0;
    if (node.nodeType !== 'Hash' || !spilled) continue;
    findings.push({
      ruleId: 'hash-spill-to-disk',
      nodeId: node.id,
      severity: 'medium',
      title: `Hash table split into ${node.hashBatches ?? '?'} batches (spilled to disk)`,
      evidence: `The hash build side did not fit in work_mem: ${node.hashBatches ?? '?'} batches, ${(node.hashBuckets ?? 0).toLocaleString()} buckets${node.tempWrittenBlocks ? `, ${node.tempWrittenBlocks.toLocaleString()} temp blocks written` : ''}. Batched reads are much slower than a single in-memory pass.`,
      suggestion:
        'Raise work_mem for this query, or shrink the hash build side (filter earlier, join on fewer columns, or pre-aggregate).',
    });
  }
  return findings;
};
