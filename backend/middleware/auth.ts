import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase.js';
import { logger } from '../src/lib/logger.js';

export interface AuthRequest extends Request {
  user?: { id: string; role?: string };
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    req.user = { id: data.user.id, role: profile?.role };
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
