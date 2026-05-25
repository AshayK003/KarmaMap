import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  completeParticipation as completeParticipationService,
  joinGig as joinGigService,
} from '../services/participationService.js';

export const completeGigSchema = z.object({
  hours: z.coerce.number().min(0.5).max(24),
  before_photo_url: z.string().url().optional(),
  after_photo_url: z.string().url().optional(),
});

async function _completeParticipation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const participationId = String(req.params.participationId);
  const body = req.body as z.infer<typeof completeGigSchema>;

  const result = await completeParticipationService(participationId, req.user!.id, {
    hours: body.hours,
    before_photo_url: body.before_photo_url,
    after_photo_url: body.after_photo_url,
  });

  res.json(result);
}

async function _joinGig(req: AuthRequest, res: Response): Promise<void> {
  const gigId = String(req.params.gigId);

  const result = await joinGigService(gigId, req.user!.id);
  res.status(201).json(result);
}

export const completeParticipation = asyncHandler(_completeParticipation);
export const joinGig = asyncHandler(_joinGig);
