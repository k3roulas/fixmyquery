import type { Finding, Rule, RuleContext } from '../../types';
import { cardinalityMismatch } from './cardinalityMismatch';
import { hashSpillToDisk } from './hashSpillToDisk';
import { largeOffset } from './largeOffset';
import { nestedLoopHighLoops } from './nestedLoopHighLoops';
import { nonSargableFilter } from './nonSargableFilter';
import { seqScanOnLargeTable } from './seqScanOnLargeTable';
import { sortSpillToDisk } from './sortSpillToDisk';

export const RULES: Rule[] = [
  seqScanOnLargeTable,
  cardinalityMismatch,
  nestedLoopHighLoops,
  sortSpillToDisk,
  hashSpillToDisk,
  nonSargableFilter,
  largeOffset,
];

export function runRules(ctx: RuleContext): Finding[] {
  return RULES.flatMap((rule) => rule(ctx));
}
