import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  const chainable = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    in: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn(),
    ...overrides,
  };
  chainable.select.mockReturnValue(chainable);
  chainable.eq.mockReturnValue(chainable);
  chainable.in.mockReturnValue(chainable);
  chainable.single.mockReturnValue(chainable);
  chainable.update.mockReturnValue(chainable);
  return chainable;
}

describe('joinGig', async () => {
  const { joinGig } = await import('../participationService.js');

  it('creates participation on fresh join', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { status: 'open', volunteers_needed: 5, volunteers_joined: 2 },
            error: null,
          }),
        };
      }
      const c = chain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
      c.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null }),
        }),
      });
      c.eq = vi.fn().mockReturnValue(c);
      return c;
    });

    const result = await joinGig('gig-1', 'vol-1');
    expect(result.participation).toEqual({ id: 'part-1' });
  });

  it('throws 409 on duplicate join', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { status: 'open', volunteers_needed: 5, volunteers_joined: 2 },
            error: null,
          }),
        };
      }
      return chain({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key' },
            }),
          }),
        }),
      });
    });

    await expect(joinGig('gig-1', 'vol-1')).rejects.toMatchObject({
      message: 'You have already joined this gig.',
      statusCode: 409,
    });
  });

  it('throws 409 on 23505 race condition', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { status: 'open', volunteers_needed: 5, volunteers_joined: 2 },
            error: null,
          }),
        };
      }
      const c = chain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
      c.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } }),
        }),
      });
      c.eq = vi.fn().mockReturnValue(c);
      return c;
    });

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

  it('falls back to direct update when RPC fails', async () => {
    const c = chain();
    c.single.mockResolvedValue({ data: { karma_points: 20, streak: 3 }, error: null });
    mockFrom.mockReturnValue(c);
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } });

    const result = await awardKarma('vol-1', 6);
    expect(result).toBe(60);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });
});

describe('completeParticipation', async () => {
  const { completeParticipation } = await import('../participationService.js');

  it('throws when participation not found', async () => {
    const c = chain();
    c.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    mockFrom.mockReturnValue(c);

    await expect(completeParticipation('part-1', 'vol-1', { hours: 2 })).rejects.toThrow(
      'Participation not found',
    );
  });

  it('completes participation and awards karma on success path', async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      const c = chain();
      c.single.mockResolvedValue(
        callIndex === 1
          ? { data: { gig_id: 'gig-1' }, error: null }
          : callIndex === 2
            ? { data: { title: 'Park Cleanup' }, error: null }
            : callIndex === 3
              ? { data: { id: 'part-1', volunteer_id: 'vol-1' }, error: null }
              : { data: { name: 'Alice' }, error: null },
      );
      c.insert = vi.fn().mockResolvedValue({ error: null });
      return c;
    });

    mockRpc.mockResolvedValue({ data: 30, error: null });

    const result = await completeParticipation('part-1', 'vol-1', { hours: 3 });

    expect(result.karma_earned).toBe(30);
    expect(result.participation.id).toBe('part-1');
    expect(mockRpc).toHaveBeenCalledWith('award_karma', { p_user_id: 'vol-1', p_hours: 3 });
  });
});
