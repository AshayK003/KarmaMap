import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  type CreateGigInput,
  createGig as createGigService,
  featureGig as featureGigService,
  getNgoAnalytics as getAnalyticsService,
  transitionGigStatus as transitionGigStatusService,
  triggerMatching as triggerMatchingService,
} from '../services/gigService.js';

export const createGigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  required_skills: z.array(z.string()).default([]),
  volunteers_needed: z.number().int().min(1).default(1),
  gig_date: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid date format')
    // Gigs in the past would pollute discovery; 60s grace covers clock skew.
    .refine((val) => Date.parse(val) >= Date.now() - 60_000, 'Gig date must be in the future'),
  location_label: z.string().optional(),
  duration: z.number().int().positive().optional(),
});

async function _createGig(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as CreateGigInput;
  const ngoId = req.user?.id;
  if (!ngoId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await createGigService(ngoId, body);
  res.status(201).json(result);
}

async function _getNgoAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const ngoId = req.user?.id;
  if (!ngoId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const result = await getAnalyticsService(ngoId);
  res.json(result);
}

export const featureGigSchema = z.object({
  hours: z.number().positive().max(24 * 30),
});

async function _featureGig(req: AuthRequest, res: Response): Promise<void> {
  const gigId = req.params.gigId;
  if (!gigId || typeof gigId !== 'string' || gigId.trim() === '') {
    res.status(400).json({ error: 'Missing gigId parameter' });
    return;
  }

  const { hours } = req.body as z.infer<typeof featureGigSchema>;
  const ngoId = req.user?.id;
  if (!ngoId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await featureGigService(gigId, ngoId, hours);
  res.json(result);
}

async function _triggerMatching(req: AuthRequest, res: Response): Promise<void> {
  const gigId = req.params.gigId;
  if (!gigId || typeof gigId !== 'string' || gigId.trim() === '') {
    res.status(400).json({ error: 'Missing gigId parameter' });
    return;
  }

  const ngoId = req.user?.id;
  if (!ngoId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await triggerMatchingService(gigId, ngoId);
  res.json(result);
}

export const createGig = asyncHandler(_createGig);
export const getNgoAnalytics = asyncHandler(_getNgoAnalytics);
export const featureGig = asyncHandler(_featureGig);
export const triggerMatching = asyncHandler(_triggerMatching);

export const gigStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']),
});

async function _transitionGigStatus(req: AuthRequest, res: Response): Promise<void> {
  const gigId = req.params.gigId;
  if (!gigId || typeof gigId !== 'string' || gigId.trim() === '') {
    res.status(400).json({ error: 'Missing gigId parameter' });
    return;
  }
  const ngoId = req.user?.id;
  if (!ngoId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { status } = req.body as z.infer<typeof gigStatusSchema>;
  const result = await transitionGigStatusService(gigId, ngoId, status);
  res.json({ gig: result });
}

export const transitionGigStatus = asyncHandler(_transitionGigStatus);
