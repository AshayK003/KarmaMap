import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';

let mockUserRole = 'ngo';

vi.mock('../../middleware/auth.js', () => ({
  verifyJwt: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', role: mockUserRole };
    next();
  },
  requireRole: (...roles: string[]) => (req: any, _res: any, next: any) => {
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
  it('returns ok status', async () => {
    const res = await supertest(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'karmamap-api' });
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
    const res = await supertest(app)
      .post('/api/gigs')
      .set('Authorization', 'Bearer test')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for volunteers_needed = 0', async () => {
    const res = await supertest(app)
      .post('/api/gigs')
      .set('Authorization', 'Bearer test')
      .send({
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
    const res = await supertest(app)
      .get('/api/gigs/analytics')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_hours');
    expect(res.body).toHaveProperty('chart_data');
  });
});

describe('PATCH /api/gigs/:gigId/feature', () => {
  it('returns 400 for hours=0 (invalid schema)', async () => {
    const res = await supertest(app)
      .patch('/api/gigs/gig-1/feature')
      .set('Authorization', 'Bearer test')
      .send({ hours: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 403 when ngo does not own the gig', async () => {
    // Default supabaseAdmin mock: single() returns { data: null } → gig not found → 403
    const res = await supertest(app)
      .patch('/api/gigs/gig-1/feature')
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
      .patch('/api/gigs/gig-1/feature')
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
      .post('/api/gigs/gig-1/match')
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
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'part-1' }, error: null }),
        }),
      }),
    });

    const res = await supertest(app)
      .post('/api/participations/join/gig-1')
      .set('Authorization', 'Bearer test');
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/participations/:participationId/complete', () => {
  it('returns 400 for hours out of range (0.1)', async () => {
    mockUserRole = 'volunteer';
    const res = await supertest(app)
      .patch('/api/participations/part-1/complete')
      .set('Authorization', 'Bearer test')
      .send({ hours: 0.1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for hours > 24', async () => {
    mockUserRole = 'volunteer';
    const res = await supertest(app)
      .patch('/api/participations/part-1/complete')
      .set('Authorization', 'Bearer test')
      .send({ hours: 25 });
    expect(res.status).toBe(400);
  });
});
