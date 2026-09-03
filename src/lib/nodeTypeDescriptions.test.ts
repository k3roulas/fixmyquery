import { describe, expect, it } from 'vitest';

import { describeNodeType } from './nodeTypeDescriptions';
import { parseExplain } from './parser';
import { SAMPLES } from './samples';

const FALLBACK = 'No curated description for this node type yet';

function collectNodeTypes(node: { nodeType: string; children: unknown[] }, acc: Set<string>): void {
  acc.add(node.nodeType);
  for (const child of node.children) {
    collectNodeTypes(child as { nodeType: string; children: unknown[] }, acc);
  }
}

describe('describeNodeType', () => {
  it('has a curated description (not the generic fallback) for every node type in the samples', () => {
    const types = new Set<string>();
    for (const sample of SAMPLES) {
      collectNodeTypes(parseExplain(sample.explainJson).root, types);
      collectNodeTypes(parseExplain(sample.explainText).root, types);
    }
    expect(types.size).toBeGreaterThan(0);
    for (const type of types) {
      const description = describeNodeType(type);
      expect(description, type).not.toContain(FALLBACK);
      expect(description.length, type).toBeGreaterThan(40);
    }
  });

  it('falls back by category for unknown-but-familiar node types', () => {
    expect(describeNodeType('Parallel Index Scan')).toContain('scan node');
    expect(describeNodeType('Anti Join')).toContain('join node');
  });

  it('returns the generic fallback for exotic node types', () => {
    expect(describeNodeType('Something Entirely Novel')).toContain(FALLBACK);
  });
});
