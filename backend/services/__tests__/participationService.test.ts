import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockGetUserById = vi.fn();

vi.mock('../supabase.js', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { admin: { getUserById: (...args: unknown[]) => mockGetUserById(...args) } },
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

  it('creates participation through the atomic join_gig RPC', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'part-1', status: 'joined' }, error: null });

    const result = await joinGig('gig-1', 'vol-1');

    expect(mockRpc).toHaveBeenCalledWith('join_gig', {
      p_gig_id: 'gig-1',
      p_volunteer_id: 'vol-1',
    });
    expect(result.participation).toEqual({ id: 'part-1', status: 'joined' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws 409 when the volunteer already joined', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'You have already joined this gig.', code: '23505' },
    });

    await expect(joinGig('gig-1', 'vol-1')).rejects.toMatchObject({
      message: 'You have already joined this gig.',
      statusCode: 409,
    });
  });

  it('throws 400 with friendly message when the gig is full', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'This gig is full', code: '23514' },
    });

    await expect(joinGig('gig-1', 'vol-1')).rejects.toMatchObject({
      message: 'This gig is full',
      statusCode: 400,
    });
  });

  it('throws 404 when the gig does not exist', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Gig not found', code: 'P0002' },
    });

    await expect(joinGig('gig-1', 'vol-1')).rejects.toMatchObject({
      message: 'Gig not found',
      statusCode: 404,
    });
  });

  it('throws 400 when the gig is closed', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'This gig is no longer accepting volunteers', code: '23514' },
    });

    await expect(joinGig('gig-1', 'vol-1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('maps unexpected RPC errors to a generic 400', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection reset' } });

    await expect(joinGig('gig-1', 'vol-1')).rejects.toMatchObject({
      message: 'Failed to join gig',
      statusCode: 400,
    });
  });
});

describe('completeParticipation', async () => {
  const { completeParticipation } = await import('../participationService.js');

  function mockNotificationSideEffects() {
    // Call order inside notifyAndEmail: gigs title lookup, profiles name lookup,
    // notifications insert, auth.admin.getUserById for the completion email.
    mockFrom.mockImplementation(((table: string) => {
      if (table === 'gigs') {
        return chain({
          single: vi.fn().mockResolvedValue({ data: { title: 'Park Cleanup' }, error: null }),
        });
      }
      if (table === 'profiles') {
        return chain({
          single: vi.fn().mockResolvedValue({ data: { name: 'Alice' }, error: null }),
        });
      }
      if (table === 'notifications') {
        const c = chain();
        c.insert = vi.fn().mockReturnValue({ error: null });
        return c;
      }
      return chain();
    }) as unknown as typeof mockFrom);
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'a@t.com' } }, error: null });
  }

  it('completes through the atomic RPC and returns karma', async () => {
    mockRpc.mockResolvedValue({
      data: { id: 'part-1', gig_id: 'gig-9', status: 'completed' },
      error: null,
    });
    mockNotificationSideEffects();

    const result = await completeParticipation('part-1', 'vol-1', { hours: 3 });

    expect(mockRpc).toHaveBeenCalledWith('complete_participation', {
      p_participation_id: 'part-1',
      p_volunteer_id: 'vol-1',
      p_hours: 3,
      p_before_photo_url: null,
      p_after_photo_url: null,
    });
    expect(result.karma_earned).toBe(30);
    expect(result.participation.id).toBe('part-1');
  });

  it('awards round(hours * 10) karma including fractional hours', async () => {
    mockRpc.mockResolvedValue({
      data: { id: 'part-1', gig_id: 'gig-9', status: 'completed' },
      error: null,
    });
    mockNotificationSideEffects();

    const result = await completeParticipation('part-1', 'vol-1', { hours: 2.5 });
    expect(result.karma_earned).toBe(25);
  });

  it('explains a not-started gig instead of failing generically', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'This gig has not started yet', code: '23514' },
    });

    await expect(completeParticipation('part-1', 'vol-1', { hours: 2.5 })).rejects.toMatchObject(
      {
        message: 'This gig has not started yet — ask the organizer to start it',
        statusCode: 409,
      },
    );
  });

  it('passes photo URLs through to the RPC', async () => {
    mockRpc.mockResolvedValue({
      data: { id: 'part-1', gig_id: 'gig-9', status: 'completed' },
      error: null,
    });
    mockNotificationSideEffects();

    await completeParticipation('part-1', 'vol-1', {
      hours: 2,
      before_photo_url: 'https://x.test/b.jpg',
      after_photo_url: 'https://x.test/a.jpg',
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'complete_participation',
      expect.objectContaining({
        p_before_photo_url: 'https://x.test/b.jpg',
        p_after_photo_url: 'https://x.test/a.jpg',
      }),
    );
  });

  it('still notifies even when side-effect queries fail (best effort)', async () => {
    mockRpc.mockResolvedValue({
      data: { id: 'part-1', gig_id: 'gig-9', status: 'completed' },
      error: null,
    });
    mockFrom.mockImplementation(() => chain() /* everything empty */);
    mockGetUserById.mockRejectedValue(new Error('network down'));

    const result = await completeParticipation('part-1', 'vol-1', { hours: 2 });
    expect(result.karma_earned).toBe(20);
  });

  it('throws 409 when the participation is already completed', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Participation not found or already completed', code: 'P0002' },
    });

    await expect(completeParticipation('part-1', 'vol-1', { hours: 2 })).rejects.toMatchObject({
      message: 'Participation already completed',
      statusCode: 409,
    });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockGetUserById).not.toHaveBeenCalled();
  });

  it('throws 404 when the participation does not exist', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Participation not found', code: 'P0002' },
    });

    await expect(completeParticipation('part-1', 'vol-1', { hours: 2 })).rejects.toMatchObject({
      message: 'Participation not found',
      statusCode: 404,
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws 400 without touching notifications on unexpected errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'connection reset', code: 'XX000' },
    });

    await expect(completeParticipation('part-1', 'vol-1', { hours: 2 })).rejects.toMatchObject({
      message: 'Failed to complete participation',
      statusCode: 400,
    });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockGetUserById).not.toHaveBeenCalled();
  });
});

describe('awardKarma removal', async () => {
  it('is no longer exported — karma moves inside the completion RPC', async () => {
    const mod = await import('../participationService.js');
    expect((mod as Record<string, unknown>).awardKarma).toBeUndefined();
  });
});
