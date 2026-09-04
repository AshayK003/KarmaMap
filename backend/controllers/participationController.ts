import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  completeParticipation as completeParticipationService,
  joinGig as joinGigService,
  leaveParticipation as leaveParticipationService,
} from '../services/participationService.js';

export const completeGigSchema = z.object({
  hours: z.coerce.number().min(0.5).max(24),
  before_photo_url: z.string().url().optional(),
  after_photo_url: z.string().url().optional(),
});

function requireUser(req: AuthRequest, res: Response): string | null {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function _completeParticipation(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const participationId = String(req.params.participationId);
  const body = req.body as z.infer<typeof completeGigSchema>;

  const result = await completeParticipationService(participationId, userId, {
    hours: body.hours,
    before_photo_url: body.before_photo_url,
    after_photo_url: body.after_photo_url,
  });

  res.json(result);
}

async function _joinGig(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const gigId = String(req.params.gigId);

  const result = await joinGigService(gigId, userId);
  res.status(201).json(result);
}

async function _leaveParticipation(req: AuthRequest, res: Response): Promise<void> {
  const userId = requireUser(req, res);
  if (!userId) return;
  const participationId = String(req.params.participationId);

  const result = await leaveParticipationService(participationId, userId);
  res.json(result);
}

export const completeParticipation = asyncHandler(_completeParticipation);
export const joinGig = asyncHandler(_joinGig);
export const leaveParticipation = asyncHandler(_leaveParticipation);