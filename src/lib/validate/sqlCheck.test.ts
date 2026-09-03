import { describe, expect, it } from 'vitest';

import { checkSqlSyntax } from './sqlCheck';

describe('checkSqlSyntax', () => {
  it('accepts a plain select', () => {
    const res = checkSqlSyntax('SELECT id, status FROM orders WHERE customer_id = 42;');
    expect(res.syntaxOk).toBe(true);
    expect(res.syntaxError).toBeUndefined();
  });

  it('accepts joins, order by and limit', () => {
    const res = checkSqlSyntax(`
      SELECT o.id, c.name
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.created_at >= '2026-01-01'
      ORDER BY o.created_at DESC
      LIMIT 20;
    `);
    expect(res.syntaxOk).toBe(true);
  });

  it('accepts a keyset pagination rewrite', () => {
    const res = checkSqlSyntax(
      "SELECT id, payload FROM events WHERE (created_at, id) < ('2026-08-01', 12345) ORDER BY created_at DESC, id DESC LIMIT 50;"
    );
    expect(res.syntaxOk).toBe(true);
  });

  it('flags a typo', () => {
    const res = checkSqlSyntax('SELEC * FROM orders');
    expect(res.syntaxOk).toBe(false);
    expect(res.syntaxError).toBeTruthy();
  });

  it('flags trailing garbage', () => {
    const res = checkSqlSyntax('SELECT 1 FROM t WHERE');
    expect(res.syntaxOk).toBe(false);
  });
});
