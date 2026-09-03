import { describe, expect, it } from 'vitest';
import { detectFormat } from '@/lib/parser/detectFormat';

describe('detectFormat', () => {
  it('detects JSON arrays and objects', () => {
    expect(detectFormat('[{"Plan": {}}]')).toBe('json');
    expect(detectFormat('  \n {"Plan": {}}')).toBe('json');
  });

  it('falls back to text', () => {
    expect(detectFormat('Limit (cost=1..2 rows=1 width=4)')).toBe('text');
    expect(detectFormat('[broken json')).toBe('text');
    expect(detectFormat('')).toBe('text');
  });
});
