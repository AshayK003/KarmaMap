import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createGig as createGigService,
  updateGig as updateGigService,
  getNgoAnalytics as getAnalyticsService,
  featureGig as featureGigService,
  triggerMatching as triggerMatchingService,
  verifyGigOwnership,
  type CreateGigInput,
} from '../services/gigService.js';

export const createGigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  lat: z.number(),
  lng: z.number(),
  required_skills: z.array(z.string()).default([]),
  volunteers_needed: z.number().int().min(1).default(1),
  gig_date: z.string().min(1),
  location_label: z.string().optional(),
});

export const updateGigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  lat: z.number(),
  lng: z.number(),
  required_skills: z.array(z.string()).default([]),
  volunteers_needed: z.number().int().min(1).default(1),
  gig_date: z.string().min(1),
});

async function _createGig(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as CreateGigInput;
  const ngoId = req.user!.id;

  const result = await createGigService(ngoId, body);
  res.status(201).json(result);
}

async function _updateGig(req: AuthRequest, res: Response): Promise<void> {
  const gigId = req.params.gigId;
  if (!gigId || typeof gigId !== 'string' || gigId.trim() === '') {
    res.status(400).json({ error: 'Missing gigId parameter' });
    return;
  }

  await verifyGigOwnership(gigId, req.user!.id);
  const result = await updateGigService(gigId, req.user!.id, req.body as CreateGigInput);
  res.json(result);
}

async function _getNgoAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const ngoId = req.user!.id;
  const result = await getAnalyticsService(ngoId);
  res.json(result);
}

export const featureGigSchema = z.object({
  hours: z.number().positive(),
});

async function _featureGig(req: AuthRequest, res: Response): Promise<void> {
  const gigId = req.params.gigId;
  if (!gigId || typeof gigId !== 'string' || gigId.trim() === '') {
    res.status(400).json({ error: 'Missing gigId parameter' });
    return;
  }

  const { hours } = req.body as z.infer<typeof featureGigSchema>;

  const result = await featureGigService(gigId, req.user!.id, hours);
  res.json(result);
}

async function _triggerMatching(req: AuthRequest, res: Response): Promise<void> {
  const gigId = req.params.gigId;
  if (!gigId || typeof gigId !== 'string' || gigId.trim() === '') {
    res.status(400).json({ error: 'Missing gigId parameter' });
    return;
  }

  const result = await triggerMatchingService(gigId, req.user!.id);
  res.json(result);
}

export const createGig = asyncHandler(_createGig);
export const updateGig = asyncHandler(_updateGig);
export const getNgoAnalytics = asyncHandler(_getNgoAnalytics);
export const featureGig = asyncHandler(_featureGig);
export const triggerMatching = asyncHandler(_triggerMatching);
