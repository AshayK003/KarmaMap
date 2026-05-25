declare const global: typeof globalThis;

import { beforeEach, describe, expect, it, vi } from 'vitest';

const injectedSession = vi.hoisted(() => ({ current: null as { access_token?: string } | null }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockImplementation(() => Promise.resolve({ data: { session: injectedSession.current } })),
    },
    channel: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  injectedSession.current = null;
});

describe('apiFetch', () => {
  it('throws on network failure after retry', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const { apiFetch } = await import('../utils/api');
    await expect(apiFetch('/test')).rejects.toThrow('Failed to fetch');
  });

  it('parses error response body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not authorized' }),
      statusText: 'Unauthorized',
      type: 'cors',
    } as Response);

    const { apiFetch } = await import('../utils/api');
    await expect(apiFetch('/test')).rejects.toThrow('Not authorized');
  });

  it('returns JSON on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    } as Response);

    const { apiFetch } = await import('../utils/api');
    const result = await apiFetch('/health');
    expect(result).toEqual({ status: 'ok' });
  });

  it('sends Authorization header when session has token', async () => {
    injectedSession.current = { access_token: 'test-token' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const { apiFetch } = await import('../utils/api');
    await apiFetch('/test');

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers.Authorization).toBe('Bearer test-token');
  });
});
