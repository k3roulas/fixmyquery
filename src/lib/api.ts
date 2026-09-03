import { NextResponse } from 'next/server';
import type { z } from 'zod';

export type JsonBodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<JsonBodyResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
