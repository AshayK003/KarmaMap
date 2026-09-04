import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import { logger } from '../src/lib/logger.js';

export interface AuthRequest extends Request {
  user?: { id: string; role?: string };
}

/**
 * Short-lived in-memory cache of profile roles. Saves one profiles query per
 * authenticated request; entries expire quickly so role changes propagate
 * within ROLE_TTL_MS.
 */
const ROLE_TTL_MS = 60_000;
const ROLE_CACHE_MAX = 5_000;
const roleCache = new Map<string, { role?: string; expiresAt: number }>();

function getCachedRole(userId: string): { role?: string } | undefined {
  const hit = roleCache.get(userId);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    roleCache.delete(userId);
    return undefined;
  }
  return hit;
}

function setCachedRole(userId: string, role?: string): void {
  if (roleCache.size >= ROLE_CACHE_MAX && !roleCache.has(userId)) {
    const firstKey = roleCache.keys().next().value;
    if (firstKey !== undefined) roleCache.delete(firstKey);
  }
  roleCache.set(userId, { role, expiresAt: Date.now() + ROLE_TTL_MS });
}

export async function verifyJwt(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn({ path: req.originalUrl }, 'Missing auth token');
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      logger.warn({ path: req.originalUrl, error: error?.message }, 'Invalid auth token');
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const userId = data.user.id;
    const cached = getCachedRole(userId);
    let role = cached?.role;

    if (!cached) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      role = profile?.role;
      // Never cache a failed lookup: a transient DB error would otherwise
      // masquerade as "no role" (403s) for a full TTL window.
      if (!profileError) setCachedRole(userId, role);
    }

    req.user = { id: userId, role };
    next();
  } catch {
    logger.warn({ path: req.originalUrl }, 'Auth verification threw');
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      logger.warn(
        { path: req.originalUrl, userId: req.user?.id, role: req.user?.role, required: roles },
        'Insufficient permissions',
      );
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
