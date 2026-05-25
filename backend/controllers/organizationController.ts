import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  getOrgAnalytics,
  getMyOrg,
  updateOptIn,
  addOrgMember,
  getOrgMembers,
  getOrgName,
} from '../services/organizationService.js';

export const addMemberSchema = z.object({
  profile_id: z.string().uuid(),
  department: z.string().max(100).optional(),
});

export const optInSchema = z.object({
  opted_in: z.boolean(),
});

async function _getAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const result = await getOrgAnalytics(req.user!.id);
  res.json(result);
}

async function _getMyOrg(req: AuthRequest, res: Response): Promise<void> {
  const result = await getMyOrg(req.user!.id);
  res.json({ org: result ?? null });
}

async function _updateOptIn(req: AuthRequest, res: Response): Promise<void> {
  const { opted_in } = req.body as z.infer<typeof optInSchema>;
  const result = await updateOptIn(req.user!.id, opted_in);
  res.json({ member: result });
}

async function _addMember(req: AuthRequest, res: Response): Promise<void> {
  const { profile_id, department } = req.body as z.infer<typeof addMemberSchema>;
  const result = await addOrgMember(req.user!.id, profile_id, department);
  res.status(201).json({ member: result });
}

async function _getMembers(req: AuthRequest, res: Response): Promise<void> {
  const members = await getOrgMembers(req.user!.id);
  res.json({ members });
}

async function _getOrgName(req: AuthRequest, res: Response): Promise<void> {
  const name = await getOrgName(req.user!.id);
  res.json({ name });
}

export const getAnalytics = asyncHandler(_getAnalytics);
export const getMyOrgHandler = asyncHandler(_getMyOrg);
export const updateOptInHandler = asyncHandler(_updateOptIn);
export const addMember = asyncHandler(_addMember);
export const getMembers = asyncHandler(_getMembers);
export const getOrgNameHandler = asyncHandler(_getOrgName);
