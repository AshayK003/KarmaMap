import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockIn = vi.fn();
const mockRpc = vi.fn();

vi.mock('../../services/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      in: mockIn,
      rpc: mockRpc,
    })),
    rpc: mockRpc,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnThis();
  mockEq.mockReturnThis();
  mockIn.mockReturnThis();
  mockSingle.mockReturnThis();
});

describe('verifyGigOwnership', () => {
  it('returns gig when ngo owns it', async () => {
    const { verifyGigOwnership } = await import('../../services/gigService.js');
    mockSingle.mockResolvedValue({
      data: { title: 'Test Gig', ngo_id: 'ngo-1' },
      error: null,
    });

    const result = await verifyGigOwnership('gig-1', 'ngo-1');
    expect(result).toEqual({ title: 'Test Gig', ngo_id: 'ngo-1' });
  });

  it('throws 403 when gig not found', async () => {
    const { verifyGigOwnership } = await import('../../services/gigService.js');
    mockSingle.mockResolvedValue({ data: null, error: null });

    await expect(verifyGigOwnership('gig-1', 'ngo-1')).rejects.toMatchObject({
      message: 'Not authorized',
      statusCode: 403,
    });
  });

  it('throws 403 when gig belongs to different ngo', async () => {
    const { verifyGigOwnership } = await import('../../services/gigService.js');
    mockSingle.mockResolvedValue({
      data: { title: 'Test', ngo_id: 'ngo-other' },
      error: null,
    });

    await expect(verifyGigOwnership('gig-1', 'ngo-1')).rejects.toMatchObject({
      message: 'Not authorized',
      statusCode: 403,
    });
  });
});

describe('createGig', () => {
  it('creates gig and returns it even if matching fails', async () => {
    const { createGig } = await import('../../services/gigService.js');

    mockRpc.mockResolvedValue({ data: { id: 'gig-1' }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await createGig('ngo-1', {
      title: 'Test Gig',
      description: 'A test gig description',
      lat: 28.6,
      lng: 77.2,
      required_skills: ['a'],
      volunteers_needed: 2,
      gig_date: '2026-06-01',
    });

    expect(result.gig).toEqual({ id: 'gig-1' });
    expect(result.matched_count).toBe(0);
  });

  it('throws when insert_gig RPC fails', async () => {
    const { createGig } = await import('../../services/gigService.js');

    mockRpc.mockRejectedValue(new Error('Insert failed'));

    await expect(
      createGig('ngo-1', {
        title: 'Test',
        description: 'A test gig description',
        lat: 28.6,
        lng: 77.2,
        required_skills: [],
        volunteers_needed: 1,
        gig_date: '2026-06-01',
      }),
    ).rejects.toThrow('Insert failed');
  });
});

describe('getNgoAnalytics', () => {
  it('returns zeros when no gigs exist', async () => {
    const { getNgoAnalytics } = await import('../../services/gigService.js');
    mockEq.mockResolvedValue({ data: [], error: null });

    const result = await getNgoAnalytics('ngo-1');
    expect(result).toEqual({
      total_hours: 0,
      completed_gigs: 0,
      total_gigs: 0,
      chart_data: [],
    });
  });
});
