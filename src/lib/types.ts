export type Severity = 'high' | 'medium' | 'low';

export type ExplainFormat = 'json' | 'text';

export interface PlanNode {
  id: string;
  nodeType: string;
  relation?: string;
  alias?: string;
  indexName?: string;
  actualLoops: number;
  actualTimeMs: number;
  estRows: number;
  actualRows: number;
  filter?: string;
  joinFilter?: string;
  sortKey?: string;
  sortMethod?: string;
  sortSpaceUsedKb?: number;
  sortSpaceType?: string;
  hashBatches?: number;
  hashBuckets?: number;
  sharedHitBlocks?: number;
  sharedReadBlocks?: number;
  tempReadBlocks?: number;
  tempWrittenBlocks?: number;
  rowsRemovedByFilter?: number;
  inclusiveMs: number;
  timeSharePct: number;
  children: PlanNode[];
}

export interface PlanTotals {
  executionMs: number;
  planningMs: number;
  sharedHitBlocks: number;
  sharedReadBlocks: number;
  tempReadBlocks: number;
  tempWrittenBlocks: number;
  nodeCount: number;
}

export interface ParsedPlan {
  format: ExplainFormat;
  root: PlanNode;
  totals: PlanTotals;
}

export interface Finding {
  ruleId: string;
  nodeId: string;
  severity: Severity;
  title: string;
  evidence: string;
  suggestion: string;
}

export interface RuleContext {
  root: PlanNode;
  totals: PlanTotals;
  sql: string;
}

export type Rule = (ctx: RuleContext) => Finding[];

export interface AiBottleneck {
  nodeId?: string | undefined;
  title: string;
  severity: Severity;
  explanation: string;
  fix: string;
}

export interface IndexSuggestion {
  name: string;
  ddl: string;
  reason: string;
}

export interface SqlVariant {
  label: string;
  sql: string;
  rationale: string;
  syntaxOk: boolean;
  syntaxError?: string | undefined;
}

export interface AiResult {
  summary: string;
  bottlenecks: AiBottleneck[];
  optimized_sql: SqlVariant[];
  proposed_indexes: IndexSuggestion[];
  caveats: string;
}

export interface AnalysisResult {
  title: string;
  sql: string;
  explainInput: string;
  explainFormat: ExplainFormat;
  root: PlanNode;
  totals: PlanTotals;
  findings: Finding[];
  ai: AiResult | null;
  aiError: string | null;
  reasoning: string | null;
  model: string;
  durationMs: number;
  saved: boolean;
  analysisId?: string | undefined;
}
