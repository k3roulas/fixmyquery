import type { Finding, Rule } from '../../types';

// The only SQL-text rule (no plan node exists for it): OFFSET >= 10,000 makes
// Postgres compute and discard all skipped rows, so cost grows linearly with
// page number. Keyset pagination is the fix. Anchored to the root node (n0)
// so the finding still renders in the plan view.
export const largeOffset: Rule = ({ sql }) => {
  const findings: Finding[] = [];
  const re = /offset\s+(\d+)/gi;
  let m: RegExpExecArray | null = re.exec(sql);
  while (m?.[1]) {
    const offset = Number(m[1]);
    if (offset >= 10_000) {
      findings.push({
        ruleId: 'large-offset',
        nodeId: 'n0',
        severity: 'high',
        title: `OFFSET ${offset.toLocaleString()} scans and discards rows`,
        evidence: `Postgres must compute, sort and throw away the first ${offset.toLocaleString()} rows before returning anything — cost grows linearly with page number.`,
        suggestion:
          'Switch to keyset (seek) pagination: WHERE (sort_col, id) < (last_seen_value) ORDER BY sort_col, id LIMIT n, keeping an index on (sort_col, id).',
      });
    }
    m = re.exec(sql);
  }
  return findings;
};
