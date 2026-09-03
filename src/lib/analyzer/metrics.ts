import type { PlanNode, PlanTotals } from '../types';

// Plan-wide rollups: walks the tree once, summing node count and buffer usage.
// Text EXPLAIN often lacks an "Execution Time" line, so the root's actual time
// stands in when executionMs is missing.
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

// Annotates every node in place with two derived values: inclusiveMs
// (actual time summed across all loop executions — loops matter, a cheap node
// run 100k times isn't cheap) and timeSharePct (share of total runtime, capped
// at 100), which drives the time-share highlighting in the plan UI.
export function computeMetrics(root: PlanNode, totals: PlanTotals): void {
  const totalMs = totals.executionMs || 1;
  for (const node of walk(root)) {
    node.inclusiveMs = node.actualTimeMs * node.actualLoops;
    node.timeSharePct = Math.min(100, (node.inclusiveMs / totalMs) * 100);
  }
}

// The tree gets walked by three different callers with different needs
// — computeTotals (needs every node),
// - computeMetrics (needs every node),
// - findNode (wants to stop early)
// The generator expresses "give me the nodes depth-first" once, without forcing every
// consumer to pay full-traversal cost up front.
export function* walk(node: PlanNode): Generator<PlanNode> {
  yield node;
  for (const child of node.children) {
    yield* walk(child);
  }
}

export function findNode(root: PlanNode, id: string): PlanNode | null {
  for (const node of walk(root)) {
    if (node.id === id) return node;
  }
  return null;
}
