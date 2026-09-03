import { z } from 'zod';

export const AiWireSchema = z.object({
  summary: z.string().min(1),
  bottlenecks: z
    .array(
      z.object({
        nodeId: z.string().optional(),
        title: z.string().min(1),
        severity: z.enum(['high', 'medium', 'low']),
        explanation: z.string().min(1),
        fix: z.string().min(1),
      })
    )
    .min(1),
  optimized_sql: z
    .array(
      z.object({
        label: z.string().min(1),
        sql: z.string().min(1),
        rationale: z.string().min(1),
      })
    )
    .min(1),
  proposed_indexes: z
    .array(
      z.object({
        name: z.string().min(1),
        ddl: z.string().min(1),
        reason: z.string().min(1),
      })
    )
    .default([]),
  caveats: z.string().default(''),
});

export type AiWire = z.infer<typeof AiWireSchema>;
