import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { supabaseAdmin } from '../services/supabase.js';
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
  const body = req.body as z.infer<typeof createGigSchema>;
  const ngoId = req.user!.id;

  const { data, error } = await supabaseAdmin.rpc('insert_gig', {
    p_title: body.title,
    p_description: body.description,
    p_ngo_id: ngoId,
    p_lat: body.lat,
    p_lng: body.lng,
    p_required_skills: body.required_skills,
    p_volunteers_needed: body.volunteers_needed,
    p_gig_date: body.gig_date,
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  try {
    const matched = await findMatchedVolunteers(data.id);
    await notifyMatchedVolunteers(data.id, matched, body.title);
    await sendGigMatchEmails(matched, body.title);
    res.status(201).json({ gig: data, matched_count: matched.length });
  } catch (matchErr) {
    console.warn('Matching skipped:', matchErr);
    res.status(201).json({ gig: data, matched_count: 0 });
  }
}

async function _getNgoAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const ngoId = req.user!.id;

  const { data: gigs } = await supabaseAdmin
    .from('gigs')
    .select('id, title, status, volunteers_joined, gig_date')
    .eq('ngo_id', ngoId);

  const gigIds = (gigs ?? []).map((g) => g.id);

  const { data: participations } = await supabaseAdmin
    .from('participations')
    .select('hours, status, gig_id')
    .in('gig_id', gigIds.length ? gigIds : ['00000000-0000-0000-0000-000000000000']);

  const totalHours = (participations ?? [])
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.hours ?? 0), 0);

  const completedGigs = (gigs ?? []).filter((g) => g.status === 'completed').length;

  const chartData = (gigs ?? []).map((g) => ({
    name: g.title.slice(0, 20),
    volunteers: g.volunteers_joined,
    completed: g.status === 'completed' ? 1 : 0,
  }));

  res.json({
    total_hours: totalHours,
    completed_gigs: completedGigs,
    total_gigs: gigs?.length ?? 0,
    chart_data: chartData,
  });
}

export const featureGigSchema = z.object({
  hours: z.number().positive(),
});

async function _featureGig(req: AuthRequest, res: Response): Promise<void> {
  const gigId = String(req.params.gigId);
  const { hours } = req.body as z.infer<typeof featureGigSchema>;

  const { data: gig } = await supabaseAdmin
    .from('gigs')
    .select('ngo_id, featured_until')
    .eq('id', gigId)
    .single();

  if (!gig || gig.ngo_id !== req.user!.id) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

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
  const { data: gig } = await supabaseAdmin
    .from('gigs')
    .select('title, ngo_id')
    .eq('id', gigId)
    .single();

  if (!gig || gig.ngo_id !== req.user!.id) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  const matched = await findMatchedVolunteers(gigId);
  await notifyMatchedVolunteers(gigId, matched, gig.title);
  await sendGigMatchEmails(matched, gig.title);

  res.json({ matched: matched.length, volunteers: matched });
}

export const createGig = asyncHandler(_createGig);
export const getNgoAnalytics = asyncHandler(_getNgoAnalytics);
export const featureGig = asyncHandler(_featureGig);
export const triggerMatching = asyncHandler(_triggerMatching);
