import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  addOrgMember,
  getMyOrg,
  getOrgAnalytics,
  getOrgMembers,
  getOrgName,
  updateOptIn,
} from '../services/organizationService.js';

export const addMemberSchema = z.object({
  profile_id: z.string().uuid(),
  department: z.string().max(100).optional(),
});

export const optInSchema = z.object({
  opted_in: z.boolean(),
});

function requireUser(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function _getAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const result = await getOrgAnalytics(userId);
  res.json(result);
}

async function _getMyOrg(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const result = await getMyOrg(userId);
  res.json({ org: result ?? null });
}

async function _updateOptIn(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { opted_in } = req.body as z.infer<typeof optInSchema>;
  const result = await updateOptIn(userId, opted_in);
  res.json({ member: result });
}

async function _addMember(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { profile_id, department } = req.body as z.infer<typeof addMemberSchema>;
  const result = await addOrgMember(userId, profile_id, department);
  res.status(201).json({ member: result });
}

async function _getMembers(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const members = await getOrgMembers(userId);
  res.json({ members });
}

async function _getOrgName(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const name = await getOrgName(userId);
  res.json({ name });
}

export const getAnalytics = asyncHandler(_getAnalytics);
export const getMyOrgHandler = asyncHandler(_getMyOrg);
export const updateOptInHandler = asyncHandler(_updateOptIn);
export const addMember = asyncHandler(_addMember);
export const getMembers = asyncHandler(_getMembers);
export const getOrgNameHandler = asyncHandler(_getOrgName);