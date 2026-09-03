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

// Applies every rule to the plan and flattens the results — each rule is
// independent and returns zero or more findings. To add a new check, write a
// rule module and register it in RULES above; nothing else needs to change.
export function runRules(ctx: RuleContext): Finding[] {
  return RULES.flatMap((rule) => rule(ctx));
}
