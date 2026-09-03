export type PostResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function postJson<T>(
  url: string,
  body: unknown,
  fallbackError: string
): Promise<PostResult<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed = await res.json().catch(() => null);
    if (!res.ok) {
      const error = (parsed as { error?: string } | null)?.error;
      return { ok: false, error: error ?? `${fallbackError} (HTTP ${res.status})` };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return { ok: false, error: 'Network error — is the server running?' };
  }
}
