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
  it('throws a friendly message on network failure after retry', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const { apiFetch } = await import('../utils/api');
    await expect(apiFetch('/test')).rejects.toThrow(
      'Network error — check your connection and try again.',
    );
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

  it('fails fast on 4xx without retrying other URLs or attempts', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Gig not found' }),
      statusText: 'Not Found',
    } as Response);

    const { apiFetch } = await import('../utils/api');
    // In the default (no VITE_API_URL) configuration there are two candidate
    // URLs and 4 attempts — a 4xx must short-circuit to exactly one fetch.
    await expect(apiFetch('/test')).rejects.toThrow('Gig not found');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx across attempts before giving up', async () => {
    vi.useFakeTimers();
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'unavailable' }),
        statusText: 'Service Unavailable',
      } as Response);

      const { apiFetch } = await import('../utils/api');
      const pending = apiFetch('/test').catch((e) => e);
      // Flush all retry backoffs (500 + 1000 + 2000 ms).
      await vi.advanceTimersByTimeAsync(4000);
      const err = await pending;

      expect(err).toBeInstanceOf(Error);
      // Two candidate URLs x four attempts.
      expect(global.fetch).toHaveBeenCalledTimes(8);
    } finally {
      vi.useRealTimers();
    }
  });
});
