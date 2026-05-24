import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { supabaseAdmin } from '../services/supabase.js';
import {
  createGig as createGigService,
  getNgoAnalytics as getAnalyticsService,
  verifyGigOwnership,
  type CreateGigInput,
} from '../services/gigService.js';
import {
  findMatchedVolunteers,
  notifyMatchedVolunteers,
} from '../services/matchingService.js';
import { sendGigMatchEmails } from '../services/emailService.js';

export const createGigSchema = z.object({
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

async function _getNgoAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const ngoId = req.user!.id;
  const result = await getAnalyticsService(ngoId);
  res.json(result);
}

export const featureGigSchema = z.object({
  hours: z.number().positive(),
});

async function _featureGig(req: AuthRequest, res: Response): Promise<void> {
  const gigId = String(req.params.gigId);
  const { hours } = req.body as z.infer<typeof featureGigSchema>;

  await verifyGigOwnership(gigId, req.user!.id);

  const featuredUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('gigs')
    .update({ featured_until: featuredUntil })
    .eq('id', gigId);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ featured_until: featuredUntil });
}

async function _triggerMatching(req: AuthRequest, res: Response): Promise<void> {
  const gigId = String(req.params.gigId);
  const gig = await verifyGigOwnership(gigId, req.user!.id);

  const matched = await findMatchedVolunteers(gigId);
  await notifyMatchedVolunteers(gigId, matched, gig.title);
  await sendGigMatchEmails(matched, gig.title);

  res.json({ matched: matched.length, volunteers: matched });
}

export const createGig = asyncHandler(_createGig);
export const getNgoAnalytics = asyncHandler(_getNgoAnalytics);
export const featureGig = asyncHandler(_featureGig);
export const triggerMatching = asyncHandler(_triggerMatching);
