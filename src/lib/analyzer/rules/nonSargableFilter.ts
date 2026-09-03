import type { Finding, Rule } from '../../types';
import { walk } from '../metrics';

const NON_SARGABLE = [
  /like\s+'%/i,
  /~~\s+'%/i,
  /\b(lower|upper)\s*\(\s*\w+\s*\)/i,
  /\b(date_trunc|extract|date_part)\s*\(/i,
];

// Heuristic regex match on each node's filter text: leading-wildcard LIKE or
// a function wrapped around the column (lower/upper/date_trunc/extract) means
// a plain B-tree index can't serve the predicate, forcing a scan.
export const nonSargableFilter: Rule = ({ root }) => {
  const findings: Finding[] = [];
  for (const node of walk(root)) {
    const predicate = node.filter ?? node.joinFilter;
    if (!predicate) continue;
    const matched = NON_SARGABLE.find((re) => re.test(predicate));
    if (!matched) continue;
    findings.push({
      ruleId: 'non-sargable-filter',
      nodeId: node.id,
      severity: 'medium',
      title: `Non-sargable predicate prevents index use: ${node.relation ?? node.nodeType}`,
      evidence: `The filter "${predicate}" applies a function or leading-wildcard LIKE to a column, so a plain B-tree index cannot serve it — forcing a scan of the underlying rows.`,
      suggestion:
        'Rewrite the predicate so the column stands alone (e.g. range conditions instead of date_trunc), or use a specialized index: pg_trgm GIN for substring LIKE, or an expression index matching the exact function call.',
    });
  }
  return findings;
};
