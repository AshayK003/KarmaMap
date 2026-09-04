import supertest from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockUserRole = 'ngo';

vi.mock('../../middleware/auth.js', () => ({
  verifyJwt: (req: any, _res: any, next: any) => {
    req.user = { id: 'ngo-1', role: mockUserRole };
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
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import { createApp } from '../../index.js';
import { supabaseAdmin } from '../../services/supabase.js';

let app: ReturnType<typeof createApp>;
const GIG_ID = '11111111-1111-4111-8111-111111111111';
const fromMock = supabaseAdmin.from as ReturnType<typeof vi.fn>;

function mockGigFetch(status: string, ngoId = 'ngo-1') {
  fromMock.mockImplementationOnce(
    () =>
      ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { ngo_id: ngoId, status }, error: null }),
          })),
        })),
      }) as unknown as ReturnType<typeof supabaseAdmin.from>,
  );
}

function mockGigUpdate(status: string) {
  const updateChain: Record<string, ReturnType<typeof vi.fn>> = {};
  updateChain.eq = vi.fn(() => updateChain);
  updateChain.select = vi.fn(() => ({
    single: vi.fn().mockResolvedValue({ data: { id: GIG_ID, status }, error: null }),
  }));
  fromMock.mockImplementationOnce(
    () =>
      ({
        update: vi.fn(() => updateChain),
      }) as unknown as ReturnType<typeof supabaseAdmin.from>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRole = 'ngo';
  app = createApp();
});

describe('PATCH /api/gigs/:gigId/status', () => {
  it('moves open → in_progress and returns the gig', async () => {
    mockGigFetch('open');
    mockGigUpdate('in_progress');

    const res = await supertest(app)
      .patch(`/api/gigs/${GIG_ID}/status`)
      .set('Authorization', 'Bearer test')
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.gig.status).toBe('in_progress');
  });

  it('returns 409 for an illegal transition', async () => {
    mockGigFetch('open');

    const res = await supertest(app)
      .patch(`/api/gigs/${GIG_ID}/status`)
      .set('Authorization', 'Bearer test')
      .send({ status: 'completed' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Cannot move gig from open to completed');
  });

  it('returns 400 for an unknown status value', async () => {
    const res = await supertest(app)
      .patch(`/api/gigs/${GIG_ID}/status`)
      .set('Authorization', 'Bearer test')
      .send({ status: 'archived' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-UUID gigId', async () => {
    const res = await supertest(app)
      .patch('/api/gigs/not-a-uuid/status')
      .set('Authorization', 'Bearer test')
      .send({ status: 'in_progress' });

    expect(res.status).toBe(400);
  });

  it('returns 403 for volunteers', async () => {
    mockUserRole = 'volunteer';

    const res = await supertest(app)
      .patch(`/api/gigs/${GIG_ID}/status`)
      .set('Authorization', 'Bearer test')
      .send({ status: 'in_progress' });

    expect(res.status).toBe(403);
  });

  it('returns 403 when the gig belongs to another ngo', async () => {
    mockGigFetch('open', 'ngo-other');

    const res = await supertest(app)
      .patch(`/api/gigs/${GIG_ID}/status`)
      .set('Authorization', 'Bearer test')
      .send({ status: 'in_progress' });

    expect(res.status).toBe(403);
  });
});
