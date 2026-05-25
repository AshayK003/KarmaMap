import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockProfileSingle = vi.fn();

vi.mock('../../services/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: (...args: unknown[]) => mockProfileSingle(...args),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function mockReqRes() {
  const req = { headers: {} } as Request & { user?: { id: string; role?: string } };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('verifyJwt', () => {
  it('returns 401 when no auth header', async () => {
    const { verifyJwt } = await import('../auth.js');
    const { req, res, next } = mockReqRes();

    await verifyJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when auth header is not Bearer', async () => {
    const { verifyJwt } = await import('../auth.js');
    const { req, res, next } = mockReqRes();
    req.headers.authorization = 'Basic token';

    await verifyJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    const { verifyJwt } = await import('../auth.js');
    const { req, res, next } = mockReqRes();
    req.headers.authorization = 'Bearer bad-token';
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });

    await verifyJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Supabase throws', async () => {
    const { verifyJwt } = await import('../auth.js');
    const { req, res, next } = mockReqRes();
    req.headers.authorization = 'Bearer token';
    mockGetUser.mockRejectedValue(new Error('Network error'));

    await verifyJwt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets user with role when profile exists', async () => {
    const { verifyJwt } = await import('../auth.js');
    const { req, res, next } = mockReqRes();
    req.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockProfileSingle.mockResolvedValue({ data: { role: 'ngo' }, error: null });

    await verifyJwt(req, res, next);

    expect(req.user).toEqual({ id: 'user-1', role: 'ngo' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('sets user with undefined role when profile missing', async () => {
    const { verifyJwt } = await import('../auth.js');
    const { req, res, next } = mockReqRes();
    req.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null });
    mockProfileSingle.mockResolvedValue({ data: null, error: null });

    await verifyJwt(req, res, next);

    expect(req.user).toEqual({ id: 'user-2', role: undefined });
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('requireRole', () => {
  it('calls next when role matches', async () => {
    const { requireRole: requireRoleFn } = await import('../auth.js');
    const middleware = requireRoleFn('ngo');
    const { req, res, next } = mockReqRes();
    req.user = { id: 'user-1', role: 'ngo' };

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when role does not match', async () => {
    const { requireRole: requireRoleFn } = await import('../auth.js');
    const middleware = requireRoleFn('ngo');
    const { req, res, next } = mockReqRes();
    req.user = { id: 'user-1', role: 'volunteer' };

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has no role', async () => {
    const { requireRole: requireRoleFn } = await import('../auth.js');
    const middleware = requireRoleFn('ngo');
    const { req, res, next } = mockReqRes();
    req.user = { id: 'user-1', role: undefined };

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts multiple roles', async () => {
    const { requireRole: requireRoleFn } = await import('../auth.js');
    const middleware = requireRoleFn('ngo', 'volunteer');
    const { req, res, next } = mockReqRes();

    req.user = { id: 'user-1', role: 'volunteer' };
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
