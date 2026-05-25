import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeDistance, skillOverlap } from '../matchingService.js';

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

describe('skillOverlap', () => {
  it('returns 1 when no skills are required', () => {
    expect(skillOverlap([], ['a', 'b'])).toBe(1);
  });

  it('returns 1 when all required skills match', () => {
    expect(skillOverlap(['a', 'b'], ['a', 'b'])).toBe(1);
  });

  it('returns 0.5 when half the skills match', () => {
    expect(skillOverlap(['a', 'b'], ['a'])).toBe(0.5);
  });

  it('returns 0 when no skills match', () => {
    expect(skillOverlap(['a', 'b'], ['c'])).toBe(0);
  });

  it('is case insensitive', () => {
    expect(skillOverlap(['First Aid'], ['first aid'])).toBe(1);
    expect(skillOverlap(['FIRST AID'], ['First Aid'])).toBe(1);
  });

  it('returns 0 when volunteer has no skills', () => {
    expect(skillOverlap(['a'], [])).toBe(0);
  });

  it('handles partial overlap with extra volunteer skills', () => {
    expect(skillOverlap(['a', 'b'], ['a', 'c', 'd'])).toBe(0.5);
  });
});

describe('normalizeDistance', () => {
  it('returns 1 for distance 0', () => {
    expect(normalizeDistance(0)).toBe(1);
  });

  it('returns 0.5 for distance at half max', () => {
    expect(normalizeDistance(25000)).toBe(0.5);
  });

  it('returns 0 for distance at max', () => {
    expect(normalizeDistance(50000)).toBe(0);
  });

  it('clamps to 0 for distance beyond max', () => {
    expect(normalizeDistance(100000)).toBe(0);
  });

  it('clamps to 1 for negative distance', () => {
    expect(normalizeDistance(-100)).toBe(1);
  });

  it('uses custom maxMeters parameter', () => {
    expect(normalizeDistance(5000, 10000)).toBe(0.5);
  });

  it('returns correct score for 25% distance', () => {
    expect(normalizeDistance(12500)).toBe(0.75);
  });
});

describe('findMatchedVolunteers', async () => {
  const { findMatchedVolunteers } = await import('../matchingService.js');

  it('throws when gig not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });

    await expect(findMatchedVolunteers('gig-1')).rejects.toThrow('Gig not found');
  });

  it('returns ranked volunteers from primary RPC', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'gig-1', required_skills: ['cleaning', 'driving'], location: null },
        error: null,
      }),
    });

    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'v1',
          name: 'Alice',
          email: 'a@t.com',
          skills: ['cleaning', 'driving'],
          distance_meters: 1000,
        },
        { id: 'v2', name: 'Bob', email: 'b@t.com', skills: ['cleaning'], distance_meters: 500 },
        { id: 'v3', name: 'Carol', email: 'c@t.com', skills: ['cooking'], distance_meters: 300 },
      ],
      error: null,
    });

    const result = await findMatchedVolunteers('gig-1', 10000, 10);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Alice');
    expect(result[0].skill_overlap).toBe(1);
    expect(result[0].final_score).toBeGreaterThan(0);
    expect(result[1].name).toBe('Bob');
    expect(result[2].name).toBe('Carol');
  });

  it('limits results to the limit parameter', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'gig-1', required_skills: ['a'], location: null },
        error: null,
      }),
    });

    mockRpc.mockResolvedValue({
      data: [
        { id: 'v1', name: 'A', email: 'a@t.com', skills: ['a'], distance_meters: 100 },
        { id: 'v2', name: 'B', email: 'b@t.com', skills: ['a'], distance_meters: 200 },
        { id: 'v3', name: 'C', email: 'c@t.com', skills: ['a'], distance_meters: 300 },
      ],
      error: null,
    });

    const result = await findMatchedVolunteers('gig-1', 10000, 2);
    expect(result).toHaveLength(2);
  });

  it('falls back to direct profile scoring when primary RPC fails', async () => {
    let useSingle = true;
    mockFrom.mockImplementation(() => {
      if (useSingle) {
        useSingle = false;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'gig-1', required_skills: ['cleaning'], location: null },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: [{ id: 'v1', name: 'Dave', skills: ['cleaning'] }],
          error: null,
        }),
      };
    });

    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC error' } });

    const result = await findMatchedVolunteers('gig-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dave');
  });

  it('uses last resort when primary RPC fails and no profiles found', async () => {
    let useSingle = true;
    mockFrom.mockImplementation(() => {
      if (useSingle) {
        useSingle = false;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'gig-1', required_skills: ['cleaning'], location: null },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
    });

    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } });

    const result = await findMatchedVolunteers('gig-1');
    expect(result).toHaveLength(0);
  });
});

describe('notifyMatchedVolunteers', async () => {
  const { notifyMatchedVolunteers } = await import('../matchingService.js');

  it('skips notification when no volunteers', async () => {
    await notifyMatchedVolunteers('gig-1', [], 'Test Gig');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('inserts notifications for each volunteer', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertFn });

    await notifyMatchedVolunteers(
      'gig-1',
      [
        {
          id: 'v1',
          name: 'A',
          email: 'a@t.com',
          skills: [],
          distance_meters: 100,
          skill_overlap: 0.5,
          final_score: 0.5,
        },
        {
          id: 'v2',
          name: 'B',
          email: 'b@t.com',
          skills: [],
          distance_meters: 200,
          skill_overlap: 0.5,
          final_score: 0.5,
        },
      ],
      'Park Cleanup',
    );

    expect(insertFn).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: 'v1', message: expect.stringContaining('Park Cleanup') }),
      expect.objectContaining({ user_id: 'v2', message: expect.stringContaining('Park Cleanup') }),
    ]);
  });
});
