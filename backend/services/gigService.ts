import { supabaseAdmin } from './supabase.js';
import {
  findMatchedVolunteers,
  notifyMatchedVolunteers,
} from './matchingService.js';
import { sendGigMatchEmails } from './emailService.js';

export interface CreateGigInput {
  title: string;
  description: string;
  lat: number;
  lng: number;
  required_skills: string[];
  volunteers_needed: number;
  gig_date: string;
}

export interface CreateGigResult {
  gig: Record<string, unknown>;
  matched_count: number;
}

export interface AnalyticsResult {
  total_hours: number;
  completed_gigs: number;
  total_gigs: number;
  chart_data: Array<{ name: string; volunteers: number; completed: number }>;
}

export interface GigOwnership {
  title: string;
  ngo_id: string;
}

export async function getGigOwnership(gigId: string): Promise<GigOwnership | null> {
  const { data } = await supabaseAdmin
    .from('gigs')
    .select('title, ngo_id')
    .eq('id', gigId)
    .single();
  return data as GigOwnership | null;
}

export async function verifyGigOwnership(
  gigId: string,
  ngoId: string
): Promise<GigOwnership> {
  const gig = await getGigOwnership(gigId);
  if (!gig || gig.ngo_id !== ngoId) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  }
  return gig;
}

export async function createGig(
  ngoId: string,
  input: CreateGigInput
): Promise<CreateGigResult> {
  const { data, error } = await supabaseAdmin.rpc('insert_gig', {
    p_title: input.title,
    p_description: input.description,
    p_ngo_id: ngoId,
    p_lat: input.lat,
    p_lng: input.lng,
    p_required_skills: input.required_skills,
    p_volunteers_needed: input.volunteers_needed,
    p_gig_date: input.gig_date,
  });

  if (error) {
    throw new Error(error.message);
  }

  try {
    const matched = await findMatchedVolunteers(data.id);
    await notifyMatchedVolunteers(data.id, matched, input.title);
    await sendGigMatchEmails(matched, input.title);
    return { gig: data, matched_count: matched.length };
  } catch (matchErr) {
    console.warn('Matching skipped:', matchErr);
    return { gig: data, matched_count: 0 };
  }
}

export async function getNgoAnalytics(ngoId: string): Promise<AnalyticsResult> {
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

  return {
    total_hours: totalHours,
    completed_gigs: completedGigs,
    total_gigs: gigs?.length ?? 0,
    chart_data: chartData,
  };
}
