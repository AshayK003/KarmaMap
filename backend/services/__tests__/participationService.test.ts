import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../supabase.js', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function chain(overrides: Record<string, unknown> = {}) {
  const chainable = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), in: vi.fn(), insert: vi.fn(), update: vi.fn(), maybeSingle: vi.fn(), ...overrides };
  chainable.select.mockReturnValue(chainable);
  chainable.eq.mockReturnValue(chainable);
  chainable.in.mockReturnValue(chainable);
  chainable.single.mockReturnValue(chainable);
  return chainable;
}

describe('joinGig', async () => {
  const { joinGig } = await import('../participationService.js');

  it('creates participation on fresh join', async () => {
    const c = chain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
    c.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null }),
      }),
    });
    c.eq = vi.fn().mockReturnValue(c);
    mockFrom.mockReturnValue(c);

    const result = await joinGig('gig-1', 'vol-1');
    expect(result.participation).toEqual({ id: 'part-1' });
  });

  it('throws 409 on duplicate join', async () => {
    const c = chain({
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
    });
    c.eq = vi.fn().mockReturnValue(c);
    mockFrom.mockReturnValue(c);

    await expect(joinGig('gig-1', 'vol-1')).rejects.toMatchObject({
      message: 'You have already joined this gig.',
      statusCode: 409,
    });
  });

  it('throws 409 on 23505 race condition', async () => {
    const c = chain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
    c.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } }),
      }),
    });
    c.eq = vi.fn().mockReturnValue(c);
    mockFrom.mockReturnValue(c);

    await expect(joinGig('gig-1', 'vol-1')).rejects.toMatchObject({
      message: 'You have already joined this gig.',
      statusCode: 409,
    });
  });
});

describe('awardKarma', async () => {
  const { awardKarma } = await import('../participationService.js');

  it('returns karma from RPC when it succeeds', async () => {
    mockRpc.mockResolvedValue({ data: 50, error: null });

    const result = await awardKarma('vol-1', 5);
    expect(result).toBe(50);
    expect(mockRpc).toHaveBeenCalledWith('award_karma', { p_user_id: 'vol-1', p_hours: 5 });
  });

  it('falls back to read-then-write when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { karma_points: 100, streak: 5 },
            error: null,
          }),
        } as any;
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any;
    });

    const result = await awardKarma('vol-1', 3);
    expect(result).toBe(30);
  });
});

describe('completeParticipation', async () => {
  const { completeParticipation } = await import('../participationService.js');

  it('throws when participation not found', async () => {
    const c = chain({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });
    mockFrom.mockReturnValue(c);

    await expect(
      completeParticipation('part-1', 'vol-1', { hours: 2 })
    ).rejects.toThrow('Participation not found');
  });
});
