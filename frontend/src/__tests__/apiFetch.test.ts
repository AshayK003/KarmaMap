import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    channel: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('apiFetch', () => {
  it('throws friendly error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const { apiFetch } = await import('../utils/api');
    await expect(apiFetch('/test')).rejects.toThrow(
      'Cannot reach the API server. Start the backend: cd backend && npm run dev'
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
    const { supabase } = await import('../lib/supabase');
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });

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
