import type { PlanNode, PlanTotals } from '../types';

export function computeTotals(root: PlanNode, planningMs: number, executionMs: number): PlanTotals {
  const totals: PlanTotals = {
    executionMs: executionMs || root.actualTimeMs,
    planningMs,
    sharedHitBlocks: 0,
    sharedReadBlocks: 0,
    tempReadBlocks: 0,
    tempWrittenBlocks: 0,
    nodeCount: 0,
  };
  for (const node of walk(root)) {
    totals.nodeCount += 1;
    totals.sharedHitBlocks += node.sharedHitBlocks ?? 0;
    totals.sharedReadBlocks += node.sharedReadBlocks ?? 0;
    totals.tempReadBlocks += node.tempReadBlocks ?? 0;
    totals.tempWrittenBlocks += node.tempWrittenBlocks ?? 0;
  }
  return totals;
}

export function computeMetrics(root: PlanNode, totals: PlanTotals): void {
  const totalMs = totals.executionMs || 1;
  for (const node of walk(root)) {
    node.inclusiveMs = node.actualTimeMs * node.actualLoops;
    node.timeSharePct = Math.min(100, (node.inclusiveMs / totalMs) * 100);
  }
}

export function* walk(node: PlanNode): Generator<PlanNode> {
  yield node;
  for (const child of node.children) {
    yield* walk(child);
  }
}
