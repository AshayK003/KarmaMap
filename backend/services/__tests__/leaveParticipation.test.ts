import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();

vi.mock('../supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { admin: { getUserById: vi.fn() } },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('leaveParticipation', async () => {
  const { leaveParticipation } = await import('../participationService.js');

  it('leaves through the atomic leave_participation RPC', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'part-1', status: 'cancelled' }, error: null });

    const result = await leaveParticipation('part-1', 'vol-1');

    expect(mockRpc).toHaveBeenCalledWith('leave_participation', {
      p_participation_id: 'part-1',
      p_volunteer_id: 'vol-1',
    });
    expect(result.participation).toEqual({ id: 'part-1', status: 'cancelled' });
  });

  it('throws 409 when already cancelled', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Participation already cancelled', code: '23505' },
    });

    await expect(leaveParticipation('part-1', 'vol-1')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('throws 404 when the participation is missing or owned by someone else', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Participation not found', code: 'P0002' },
    });

    await expect(leaveParticipation('part-1', 'vol-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 400 when trying to cancel a completed participation', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Completed participations cannot be cancelled', code: '23514' },
    });

    await expect(leaveParticipation('part-1', 'vol-1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
