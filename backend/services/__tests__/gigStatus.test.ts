import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSingle = vi.fn();
const mockUpdateSingle = vi.fn();

const chain: Record<string, ReturnType<typeof vi.fn>> = {};
chain.select = vi.fn(() => chain);
chain.eq = vi.fn(() => chain);
chain.single = mockSingle;
const updateChain: Record<string, ReturnType<typeof vi.fn>> = {};
updateChain.eq = vi.fn(() => updateChain);
updateChain.select = vi.fn(() => ({ single: mockUpdateSingle }));
chain.update = vi.fn(() => updateChain);

vi.mock('../../services/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(() => chain),
    rpc: vi.fn(),
  },
}));

const OWNED = { data: { ngo_id: 'ngo-1', status: 'open' }, error: null };
const UPDATED = (status: string) => ({ data: { id: 'gig-1', status }, error: null });

async function transition(gigId: string, ngoId: string, toStatus: any) {
  const { transitionGigStatus } = await import('../../services/gigService.js');
  return transitionGigStatus(gigId, ngoId, toStatus);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transitionGigStatus legal moves', () => {
  it.each([
    ['open', 'in_progress'],
    ['open', 'cancelled'],
    ['in_progress', 'completed'],
    ['in_progress', 'cancelled'],
    ['cancelled', 'open'],
  ])('%s → %s succeeds', async (from, to) => {
    mockSingle
      .mockResolvedValueOnce({ data: { ngo_id: 'ngo-1', status: from }, error: null });
    mockUpdateSingle.mockResolvedValueOnce(UPDATED(to));

    const result = await transition('gig-1', 'ngo-1', to);
    expect(result).toEqual({ id: 'gig-1', status: to });
  });
});

describe('transitionGigStatus illegal moves', () => {
  it.each([
    ['open', 'completed'],
    ['in_progress', 'open'],
    ['completed', 'open'],
    ['completed', 'cancelled'],
    ['cancelled', 'completed'],
  ])('%s → %s throws 409', async (from, to) => {
    mockSingle.mockResolvedValueOnce({ data: { ngo_id: 'ngo-1', status: from }, error: null });

    await expect(transition('gig-1', 'ngo-1', to)).rejects.toMatchObject({
      message: `Cannot move gig from ${from} to ${to}`,
      statusCode: 409,
    });
  });
});

describe('transitionGigStatus auth and failures', () => {
  it('throws 403 when the gig belongs to a different ngo', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ngo_id: 'ngo-other', status: 'open' }, error: null });

    await expect(transition('gig-1', 'ngo-1', 'in_progress')).rejects.toMatchObject({
      message: 'Not authorized',
      statusCode: 403,
    });
  });

  it('throws 403 when the gig does not exist', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(transition('gig-1', 'ngo-1', 'in_progress')).rejects.toMatchObject({
      message: 'Not authorized',
      statusCode: 403,
    });
  });

  it('throws 500 when the ownership lookup fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });

    await expect(transition('gig-1', 'ngo-1', 'in_progress')).rejects.toMatchObject({
      message: 'Failed to verify gig ownership',
      statusCode: 500,
    });
  });

  it('throws 500 when the status update fails', async () => {
    mockSingle.mockResolvedValueOnce(OWNED);
    mockUpdateSingle.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });

    await expect(transition('gig-1', 'ngo-1', 'in_progress')).rejects.toMatchObject({
      message: 'Failed to update gig status',
      statusCode: 500,
    });
  });

  it('throws 409 when a concurrent move already changed the state', async () => {
    mockSingle.mockResolvedValueOnce(OWNED);
    mockUpdateSingle.mockResolvedValueOnce({ data: null, error: { message: '0 rows', code: 'PGRST116' } });

    await expect(transition('gig-1', 'ngo-1', 'in_progress')).rejects.toMatchObject({
      message: 'Cannot move gig from open to in_progress',
      statusCode: 409,
    });
  });

  it('throws 409 when the database guard rejects the move', async () => {
    mockSingle.mockResolvedValueOnce(OWNED);
    mockUpdateSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Illegal gig status transition from open to cancelled', code: '42501' },
    });

    await expect(transition('gig-1', 'ngo-1', 'cancelled')).rejects.toMatchObject({
      message: 'Cannot move gig from open to cancelled',
      statusCode: 409,
    });
  });
});
