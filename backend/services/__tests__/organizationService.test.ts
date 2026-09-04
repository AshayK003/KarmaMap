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

function chain(): any {
  const c: any = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: null, error: null });
  c.maybeSingle = vi.fn().mockReturnValue(c);
  c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  c.then = (resolve: (v: unknown) => void) =>
    resolve(c._resolveValue ?? { data: null, error: null });
  c.catch = () => c;
  c.setResolve = (val: unknown) => {
    c._resolveValue = val;
  };
  return c;
}

describe('getOrgAnalytics', () => {
  it('returns zeros when no opted-in members', async () => {
    const { getOrgAnalytics } = await import('../organizationService.js');

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const c = chain();
      if (callCount === 1) {
        c.maybeSingle.mockResolvedValue({
          data: { organization_id: 'org-1' },
          error: null,
        });
      } else if (callCount === 2) {
        c.setResolve({ data: [], error: null });
      } else if (callCount === 3) {
        c.setResolve({ data: [], error: null });
      } else if (callCount === 4) {
        c.setResolve({ data: [], error: null });
      }
      return c;
    });

    const result = await getOrgAnalytics('vol-1');

    expect(result.total_hours).toBe(0);
    expect(result.active_members).toBe(0);
    expect(result.total_members).toBe(0);
    expect(result.completed_count).toBe(0);
    expect(result.hours_by_department).toEqual([]);
    expect(result.hours_by_month).toEqual([]);
    expect(result.recent_activities).toEqual([]);
  });

  it('aggregates hours correctly', async () => {
    const { getOrgAnalytics } = await import('../organizationService.js');

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const c = chain();
      if (callCount === 1) {
        c.maybeSingle.mockResolvedValue({
          data: { organization_id: 'org-1' },
          error: null,
        });
      } else if (callCount === 2) {
        c.setResolve({
          data: [
            {
              profile_id: 'v1',
              department: 'Engineering',
              role: 'member',
              profiles: { name: 'Alice' },
            },
            {
              profile_id: 'v2',
              department: 'Marketing',
              role: 'member',
              profiles: { name: 'Bob' },
            },
          ],
          error: null,
        });
      } else if (callCount === 3) {
        c.setResolve({
          data: [
            { profile_id: 'v1', role: 'member' },
            { profile_id: 'v2', role: 'member' },
          ],
          error: null,
        });
      } else if (callCount === 4) {
        c.setResolve({
          data: [
            {
              volunteer_id: 'v1',
              hours: 4,
              created_at: '2026-05-01T00:00:00Z',
              gigs: { title: 'Beach Cleanup', gig_date: '2026-05-01' },
            },
            {
              volunteer_id: 'v2',
              hours: 6,
              created_at: '2026-05-15T00:00:00Z',
              gigs: { title: 'Tree Planting', gig_date: '2026-05-15' },
            },
          ],
          error: null,
        });
      }
      return c;
    });

    const result = await getOrgAnalytics('vol-1');

    expect(result.total_hours).toBe(10);
    expect(result.active_members).toBe(2);
    expect(result.total_members).toBe(2);
    expect(result.completed_count).toBe(2);
    expect(result.hours_by_department).toHaveLength(2);
    expect(result.recent_activities).toHaveLength(2);
  });

  it('throws when profile is not a member', async () => {
    const { getOrgAnalytics } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(c);

    await expect(getOrgAnalytics('non-member')).rejects.toMatchObject({
      message: 'Not a member of any organization',
      statusCode: 403,
    });
  });
});

describe('getMyOrg', () => {
  it('returns org info for a member', async () => {
    const { getMyOrg } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({
      data: {
        role: 'member',
        department: 'Engineering',
        opted_in: true,
        organizations: { name: 'Acme Corp', slug: 'acme-corp' },
      },
      error: null,
    });
    mockFrom.mockReturnValue(c);

    const result: any = await getMyOrg('vol-1');

    expect(result.role).toBe('member');
    expect(result.opted_in).toBe(true);
    expect(result.organizations.name).toBe('Acme Corp');
  });

  it('returns null for non-member', async () => {
    const { getMyOrg } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(c);

    const result = await getMyOrg('vol-404');

    expect(result).toBeNull();
  });

  it('hides raw database errors behind a generic 400', async () => {
    const { getMyOrg } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'relation "x" does not exist', code: '42P01' },
    });
    mockFrom.mockReturnValue(c);

    await expect(getMyOrg('vol-1')).rejects.toMatchObject({
      message: 'Failed to fetch organization',
      statusCode: 400,
    });
  });
});

describe('updateOptIn', () => {
  it('updates opt-in to true', async () => {
    const { updateOptIn } = await import('../organizationService.js');

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const c = chain();
      if (callCount === 1) {
        c.maybeSingle.mockResolvedValue({ data: { id: 'mem-1' }, error: null });
      } else {
        c.select.mockReturnThis();
        c.eq.mockReturnThis();
        c.single.mockResolvedValue({
          data: { id: 'mem-1', opted_in: true },
          error: null,
        });
      }
      return c;
    });

    const result = await updateOptIn('vol-1', true);

    expect(result).toHaveProperty('opted_in', true);
  });

  it('throws for non-member', async () => {
    const { updateOptIn } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(c);

    await expect(updateOptIn('vol-404', true)).rejects.toMatchObject({
      message: 'Not a member of any organization',
      statusCode: 403,
    });
  });
});

describe('addOrgMember', () => {
  it('adds a member when admin is authorized', async () => {
    const { addOrgMember } = await import('../organizationService.js');

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const c = chain();
      if (callCount === 1) {
        c.maybeSingle.mockResolvedValue({
          data: { organization_id: 'org-1' },
          error: null,
        });
      } else {
        c.single.mockResolvedValue({
          data: { id: 'mem-new', profile_id: 'vol-new', role: 'member' },
          error: null,
        });
      }
      return c;
    });

    const result = await addOrgMember('admin-1', 'vol-new');

    expect(result).toHaveProperty('id', 'mem-new');
  });

  it('throws when admin is not an admin', async () => {
    const { addOrgMember } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(c);

    await expect(addOrgMember('non-admin', 'vol-1')).rejects.toMatchObject({
      message: 'Not authorized',
      statusCode: 403,
    });
  });

  it('throws 409 on duplicate member', async () => {
    const { addOrgMember } = await import('../organizationService.js');

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const c = chain();
      if (callCount === 1) {
        c.maybeSingle.mockResolvedValue({
          data: { organization_id: 'org-1' },
          error: null,
        });
      } else {
        c.single.mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate' },
        });
      }
      return c;
    });

    await expect(addOrgMember('admin-1', 'existing-vol')).rejects.toMatchObject({
      message: 'User is already a member',
      statusCode: 409,
    });
  });
});

describe('getOrgMembers', () => {
  it('returns members list for admin', async () => {
    const { getOrgMembers } = await import('../organizationService.js');

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const c = chain();
      if (callCount === 1) {
        c.maybeSingle.mockResolvedValue({
          data: { organization_id: 'org-1' },
          error: null,
        });
      } else {
        c.select.mockReturnThis();
        c.eq.mockReturnThis();
        c.order.mockResolvedValue({
          data: [
            { id: 'mem-1', profile_id: 'v1', role: 'admin', profiles: { id: 'v1', name: 'Alice' } },
            { id: 'mem-2', profile_id: 'v2', role: 'member', profiles: { id: 'v2', name: 'Bob' } },
          ],
          error: null,
        });
      }
      return c;
    });

    const result = await getOrgMembers('admin-1');

    expect(result).toHaveLength(2);
  });
});

describe('getOrgName', () => {
  it('returns org name for member', async () => {
    const { getOrgName } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({
      data: { organizations: { name: 'Acme Corp' } },
      error: null,
    });
    mockFrom.mockReturnValue(c);

    const result = await getOrgName('vol-1');

    expect(result).toBe('Acme Corp');
  });

  it('returns null for non-member', async () => {
    const { getOrgName } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(c);

    const result = await getOrgName('vol-404');

    expect(result).toBeNull();
  });

  it('throws instead of masquerading a DB error as non-membership', async () => {
    const { getOrgName } = await import('../organizationService.js');
    const c = chain();
    c.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection reset', code: 'XX000' },
    });
    mockFrom.mockReturnValue(c);

    await expect(getOrgName('vol-1')).rejects.toMatchObject({
      message: 'Failed to fetch organization',
      statusCode: 400,
    });
  });
});

describe('getOrgAnalytics member scan', () => {
  it('throws instead of reporting zero members on scan failure', async () => {
    const { getOrgAnalytics } = await import('../organizationService.js');

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const c = chain();
      if (callCount === 1) {
        c.maybeSingle.mockResolvedValue({ data: { organization_id: 'org-1' }, error: null });
      } else if (callCount === 2) {
        c.setResolve({ data: [{ profile_id: 'v1', department: 'Ops' }], error: null });
      } else {
        c.setResolve({ data: null, error: { message: 'db down' } });
      }
      return c;
    });

    await expect(getOrgAnalytics('vol-1')).rejects.toMatchObject({
      message: 'Failed to fetch analytics',
    });
  });

  it('pages participations queries past 200 ids', async () => {
    const { getOrgAnalytics } = await import('../organizationService.js');
    const ids = Array.from({ length: 250 }, (_, i) => `v${i}`);
    const members = ids.map((id) => ({ profile_id: id, department: 'Ops' }));

    let callCount = 0;
    mockFrom.mockImplementation((table: unknown) => {
      callCount++;
      const c = chain();
      if (callCount === 1) {
        c.maybeSingle.mockResolvedValue({ data: { organization_id: 'org-1' }, error: null });
      } else if (callCount === 2) {
        c.setResolve({ data: members, error: null });
      } else if (callCount === 3) {
        c.setResolve({ data: members.map((m) => ({ profile_id: m.profile_id, role: 'member' })), error: null });
      } else {
        c.setResolve({ data: [], error: null });
      }
      return c;
    });

    const result = await getOrgAnalytics('vol-1');
    const partCalls = (mockFrom.mock.calls as unknown[][]).filter((a) => a[0] === 'participations');
    expect(partCalls).toHaveLength(2);
    expect(result.total_members).toBe(250);
  });
});
