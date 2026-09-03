import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireSession } from '@/lib/auth/guard';
import { getSession } from '@/lib/auth/session';

// Real redirect() throws and never returns — mirror that contract so an
// implementation that "falls through" after redirect would fail the test.
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' });
  }),
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

const session = { userId: 'u-1', email: 'a@b.c' };

describe('requireSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the session when authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(session);
    await expect(requireSession('/history')).resolves.toEqual(session);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to login with the current path encoded as next', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(requireSession('/history/some id')).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/login?next=%2Fhistory%2Fsome%20id');
  });

  it('defaults next to /app', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(requireSession()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/login?next=%2Fapp');
  });
});
