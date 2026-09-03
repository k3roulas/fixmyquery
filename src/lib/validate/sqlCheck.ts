import { Parser } from 'node-sql-parser';

const parser = new Parser();

export interface SqlCheckResult {
  syntaxOk: boolean;
  syntaxError?: string;
}

export function checkSqlSyntax(sql: string): SqlCheckResult {
  try {
    parser.astify(sql, { database: 'PostgreSQL' });
    return { syntaxOk: true };
  } catch (err) {
    return {
      syntaxOk: false,
      syntaxError: err instanceof Error ? err.message : 'Unknown syntax error',
    };
  }
}
