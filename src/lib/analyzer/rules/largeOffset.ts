import type { Finding, Rule } from '../../types';

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
