import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  type CreateGigInput,
  createGig as createGigService,
  featureGig as featureGigService,
  getNgoAnalytics as getAnalyticsService,
  triggerMatching as triggerMatchingService,
} from '../services/gigService.js';

export const createGigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  required_skills: z.array(z.string()).default([]),
  volunteers_needed: z.number().int().min(1).default(1),
  gig_date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid date format'),
  location_label: z.string().optional(),
  duration: z.number().int().positive().optional(),
});

async function _createGig(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as CreateGigInput;
  const ngoId = req.user!.id;

  const result = await createGigService(ngoId, body);
  res.status(201).json(result);
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
export const getNgoAnalytics = asyncHandler(_getNgoAnalytics);
export const featureGig = asyncHandler(_featureGig);
export const triggerMatching = asyncHandler(_triggerMatching);
