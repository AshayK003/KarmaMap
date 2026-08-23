import supertest from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockUserRole = 'ngo';

vi.mock('../../middleware/auth.js', () => ({
  verifyJwt: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', role: mockUserRole };
    next();
  },
  requireRole:
    (...roles: string[]) =>
    (req: any, _res: any, next: any) => {
      if (!req.user?.role || !roles.includes(req.user.role)) {
        _res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      next();
    },
}));

vi.mock('../../services/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: { id: 'gig-1' }, error: null }),
  },
}));

import { createApp } from '../../index.js';

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRole = 'ngo';
  app = createApp();
});

describe('GET /health', () => {
  it('returns ok status when database is reachable', async () => {
    const res = await supertest(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'karmamap-api' });
  });

  it('returns 503 when the database check fails', async () => {
    const { supabaseAdmin } = await import('../../services/supabase.js');
    // One-shot override so later tests keep the default mock behaviour.
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () =>
        ({
          select: vi
            .fn()
            .mockResolvedValue({ count: null, error: { message: 'db down' } }),
        }) as unknown as ReturnType<typeof supabaseAdmin.from>,
    );

    const res = await supertest(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
  });
});

describe('route parameter validation', () => {
  it('returns 400 for a non-UUID gigId on POST /api/gigs/:gigId/match', async () => {
    const res = await supertest(app)
      .post('/api/gigs/not-a-uuid/match')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid route parameters');
  });

  it('returns 400 for a non-UUID participationId on PATCH complete', async () => {
    mockUserRole = 'volunteer';
    const res = await supertest(app)
      .patch('/api/participations/nope/complete')
      .set('Authorization', 'Bearer test')
      .send({ hours: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid route parameters');
  });

  it('accepts valid UUIDs and proceeds past validation', async () => {
    const res = await supertest(app)
      .post('/api/gigs/11111111-1111-4111-8111-111111111111/match')
      .set('Authorization', 'Bearer test');
    // Past param validation: ownership check fails on the default mock → 403.
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/gigs/:gigId/feature hours cap', () => {
  it('returns 400 for hours above the 720h cap', async () => {
    const res = await supertest(app)
      .patch('/api/gigs/11111111-1111-4111-8111-111111111111/feature')
      .set('Authorization', 'Bearer test')
      .send({ hours: 10000 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/gigs', () => {
  it('returns 400 for invalid body (short title)', async () => {
    const res = await supertest(app)
      .post('/api/gigs')
      .set('Authorization', 'Bearer test')
      .send({ title: 'AB' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await supertest(app).post('/api/gigs').set('Authorization', 'Bearer test').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for volunteers_needed = 0', async () => {
    const res = await supertest(app).post('/api/gigs').set('Authorization', 'Bearer test').send({
      title: 'Test Gig',
      description: 'Valid description for a test gig',
      lat: 28.6,
      lng: 77.2,
      volunteers_needed: 0,
      gig_date: '2026-06-01',
    });
    expect(res.status).toBe(400);
  });

  it('returns 201 for valid NGO request', async () => {
    const { supabaseAdmin } = await import('../../services/supabase.js');
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'gig-1' },
      error: null,
    });

    const res = await supertest(app)
      .post('/api/gigs')
      .set('Authorization', 'Bearer test')
      .send({
        title: 'Test Gig',
        description: 'This is a valid test gig description',
        lat: 28.6,
        lng: 77.2,
        required_skills: ['first aid'],
        volunteers_needed: 3,
        gig_date: '2026-06-01',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('gig');
  });
});

describe('GET /api/gigs/analytics', () => {
  it('returns analytics for NGO', async () => {
    const res = await supertest(app).get('/api/gigs/analytics').set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_hours');
    expect(res.body).toHaveProperty('chart_data');
  });
});

describe('PATCH /api/gigs/:gigId/feature', () => {
  const GIG_ID = '22222222-2222-4222-8222-222222222222';

  it('returns 400 for hours=0 (invalid schema)', async () => {
    const res = await supertest(app)
      .patch(`/api/gigs/${GIG_ID}/feature`)
      .set('Authorization', 'Bearer test')
      .send({ hours: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 403 when ngo does not own the gig', async () => {
    // Default supabaseAdmin mock: single() returns { data: null } → gig not found → 403
    const res = await supertest(app)
      .patch(`/api/gigs/${GIG_ID}/feature`)
      .set('Authorization', 'Bearer test')
      .send({ hours: 2 });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Not authorized');
  });

  it('returns 200 for valid hours', async () => {
    const { supabaseAdmin } = await import('../../services/supabase.js');
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { title: 'Gig', ngo_id: 'test-user-id' },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await supertest(app)
      .patch(`/api/gigs/${GIG_ID}/feature`)
      .set('Authorization', 'Bearer test')
      .send({ hours: 2 });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/gigs/:gigId/match', () => {
  it('returns matched volunteers after triggering matching', async () => {
    const { supabaseAdmin } = await import('../../services/supabase.js');
    let fromCallCount = 0;
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount <= 2) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'gig-1',
              ngo_id: 'test-user-id',
              title: 'Test Gig',
              required_skills: ['cleaning'],
            },
            error: null,
          }),
        } as any;
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any;
    });

    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { id: 'v1', name: 'Alice', email: 'a@t.com', skills: ['cleaning'], distance_meters: 500 },
      ],
      error: null,
    });

    const res = await supertest(app)
      .post('/api/gigs/11111111-1111-4111-8111-111111111111/match')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(1);
    expect(res.body.volunteers[0].name).toBe('Alice');
  });
});

describe('POST /api/participations/join/:gigId', () => {
  it('calls join endpoint', async () => {
    mockUserRole = 'volunteer';
    const { supabaseAdmin } = await import('../../services/supabase.js');
    let callCount = 0;
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
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
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null }),
          }),
        }),
      };
    });

    const res = await supertest(app)
      .post('/api/participations/join/44444444-4444-4444-8444-444444444444')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/participations/:participationId/complete', () => {
  const PART_ID = '33333333-3333-4333-8333-333333333333';

  it('returns 400 for hours out of range (0.1)', async () => {
    mockUserRole = 'volunteer';
    const res = await supertest(app)
      .patch(`/api/participations/${PART_ID}/complete`)
      .set('Authorization', 'Bearer test')
      .send({ hours: 0.1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for hours > 24', async () => {
    mockUserRole = 'volunteer';
    const res = await supertest(app)
      .patch(`/api/participations/${PART_ID}/complete`)
      .set('Authorization', 'Bearer test')
      .send({ hours: 25 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/ngo/upi', () => {
  it('returns 200 for valid upi_id', async () => {
    const { supabaseAdmin } = await import('../../services/supabase.js');
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'test-user-id', name: 'Test NGO', upi_id: 'ngo@upi', upi_qr_url: null },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    });

    const res = await supertest(app)
      .patch('/api/ngo/upi')
      .set('Authorization', 'Bearer test')
      .send({ upi_id: 'ngo@upi' });
    expect(res.status).toBe(200);
    expect(res.body.profile.upi_id).toBe('ngo@upi');
  });

  it('returns 400 for invalid upi_id format', async () => {
    const res = await supertest(app)
      .patch('/api/ngo/upi')
      .set('Authorization', 'Bearer test')
      .send({ upi_id: 'notavalidupi' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty body (no fields)', async () => {
    const res = await supertest(app)
      .patch('/api/ngo/upi')
      .set('Authorization', 'Bearer test')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 403 for volunteer role', async () => {
    mockUserRole = 'volunteer';
    const res = await supertest(app)
      .patch('/api/ngo/upi')
      .set('Authorization', 'Bearer test')
      .send({ upi_id: 'ngo@upi' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/organizations/analytics', () => {
  it('returns 403 when user not in any org', async () => {
    const { supabaseAdmin } = await import('../../services/supabase.js');
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    });

    const res = await supertest(app)
      .get('/api/organizations/analytics')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Not a member of any organization');
  });

  it('returns analytics for org member', async () => {
    const { supabaseAdmin } = await import('../../services/supabase.js');

    let callCount = 0;
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      const c: any = {
        select: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        in: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        order: vi.fn(),
      };
      c.then = (resolve: (v: unknown) => void) => resolve(c._val ?? { data: null, error: null });
      c.catch = () => c;
      c.setVal = (v: unknown) => {
        c._val = v;
      };
      c.select = vi.fn().mockReturnValue(c);
      c.eq = vi.fn().mockReturnValue(c);
      c.in = vi.fn().mockReturnValue(c);
      c.update = vi.fn().mockReturnValue(c);
      c.order = vi.fn().mockReturnValue(c);
      c.single = vi.fn().mockReturnValue(c);
      c.single = vi.fn().mockResolvedValue({ data: null, error: null });
      c.maybeSingle = vi.fn().mockReturnValue(c);
      c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      if (callCount === 1) {
        c.maybeSingle = vi.fn().mockResolvedValue({
          data: { organization_id: 'org-1' },
          error: null,
        });
      } else if (callCount === 2) {
        c.setVal({
          data: [
            {
              profile_id: 'v1',
              department: 'Engineering',
              role: 'member',
              profiles: { name: 'Alice' },
            },
          ],
          error: null,
        });
      } else if (callCount === 3) {
        c.setVal({
          data: [{ profile_id: 'v1', role: 'member' }],
          error: null,
        });
      } else if (callCount === 4) {
        c.setVal({
          data: [
            {
              volunteer_id: 'v1',
              hours: 4,
              created_at: '2026-05-01T00:00:00Z',
              gigs: { title: 'Beach Cleanup', gig_date: '2026-05-01' },
            },
          ],
          error: null,
        });
      }
      return c;
    });

    const res = await supertest(app)
      .get('/api/organizations/analytics')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body.total_hours).toBe(4);
    expect(res.body.active_members).toBe(1);
  });
});
