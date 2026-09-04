import { logger } from '../src/lib/logger.js';
import { sendGigMatchEmails } from './emailService.js';
import {
  findMatchedVolunteers,
  type MatchedVolunteer,
  notifyMatchedVolunteers,
} from './matchingService.js';
import { supabaseAdmin } from './supabase.js';

export interface CreateGigInput {
  title: string;
  description: string;
  lat: number;
  lng: number;
  required_skills: string[];
  volunteers_needed: number;
  gig_date: string;
  location_label?: string;
  duration?: number;
}

interface CreateGigResult {
  gig: Record<string, unknown>;
  matched_count: number;
}

interface AnalyticsResult {
  total_hours: number;
  completed_gigs: number;
  total_gigs: number;
  chart_data: Array<{ name: string; volunteers: number; completed: number }>;
}

interface GigOwnership {
  title: string;
  ngo_id: string;
}

async function getGigOwnership(gigId: string): Promise<GigOwnership | null> {
  const { data, error } = await supabaseAdmin
    .from('gigs')
    .select('title, ngo_id')
    .eq('id', gigId)
    .single();
  // A database failure is a 500, not a 403 — conflating them hides outages.
  if (error) {
    logger.error({ gigId, error: error.message }, 'Failed to fetch gig ownership');
    throw Object.assign(new Error('Failed to verify gig ownership'), { statusCode: 500 });
  }
  return data as GigOwnership | null;
}

async function runMatching(
  gigId: string,
  gigTitle: string,
): Promise<{ matched_count: number; volunteers: MatchedVolunteer[] }> {
  const matched = await findMatchedVolunteers(gigId);
  await notifyMatchedVolunteers(gigId, matched, gigTitle);
  await sendGigMatchEmails(matched, gigTitle);
  return { matched_count: matched.length, volunteers: matched };
}

/** Upper bound for featured duration to prevent runaway/abusive requests. */
export const MAX_FEATURE_HOURS = 24 * 30;

export async function featureGig(
  gigId: string,
  ngoId: string,
  hours: number,
): Promise<{ featured_until: string }> {
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_FEATURE_HOURS) {
    throw Object.assign(new Error(`hours must be between 0 and ${MAX_FEATURE_HOURS}`), {
      statusCode: 400,
    });
  }

  await verifyGigOwnership(gigId, ngoId);

  const featuredUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('gigs')
    .update({ featured_until: featuredUntil })
    .eq('id', gigId);

  if (error) {
    logger.error({ gigId, error: error.message }, 'Failed to feature gig');
    throw new Error('Failed to update gig');
  }

  return { featured_until: featuredUntil };
}

export async function triggerMatching(
  gigId: string,
  ngoId: string,
): Promise<{ matched: number; volunteers: MatchedVolunteer[] }> {
  const gig = await verifyGigOwnership(gigId, ngoId);

  const result = await runMatching(gigId, gig.title);

  return { matched: result.matched_count, volunteers: result.volunteers };
}

export async function verifyGigOwnership(gigId: string, ngoId: string): Promise<GigOwnership> {
  const gig = await getGigOwnership(gigId);
  if (!gig || gig.ngo_id !== ngoId) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  }
  return gig;
}

export async function createGig(ngoId: string, input: CreateGigInput): Promise<CreateGigResult> {
  const { data, error } = await supabaseAdmin.rpc('insert_gig', {
    p_title: input.title,
    p_description: input.description,
    p_ngo_id: ngoId,
    p_lat: input.lat,
    p_lng: input.lng,
    p_required_skills: input.required_skills,
    p_volunteers_needed: input.volunteers_needed,
    p_gig_date: input.gig_date,
    p_location_label: input.location_label ?? '',
    p_duration: input.duration ?? null,
  });

  if (error) {
    logger.error({ error: error.message, p_title: input.title }, 'Failed to create gig');
    throw new Error('Failed to create gig');
  }

  if (!data?.id || typeof data.id !== 'string') {
    throw new Error('Gig creation RPC returned no valid id');
  }

  try {
    const { matched_count } = await runMatching(data.id, input.title);
    return { gig: data, matched_count };
  } catch (matchErr) {
    logger.warn(
      { gigId: data.id, error: (matchErr as Error).message },
      'Matching skipped after gig creation',
    );
    return { gig: data, matched_count: 0 };
  }
}

export async function getNgoAnalytics(ngoId: string): Promise<AnalyticsResult> {
  // Try aggregated RPC first (returns JSON), fall back to manual joins
  let gigsData: Array<Record<string, unknown>> | null = null;
  let participationsData: Array<Record<string, unknown>> | null = null;

  try {
    const { data: agg, error } = await supabaseAdmin.rpc('get_ngo_analytics', {
      p_ngo_id: ngoId,
    });
    if (
      !error &&
      agg &&
      typeof agg === 'object' &&
      'total_gigs' in (agg as Record<string, unknown>)
    ) {
      return agg as unknown as AnalyticsResult;
    }
  } catch {
    // RPC not available, fall through to manual query
  }

  const { data: g } = await supabaseAdmin
    .from('gigs')
    .select('id, title, status, volunteers_joined, gig_date')
    .eq('ngo_id', ngoId);
  gigsData = g as Array<Record<string, unknown>>;

  const gigIds = (gigsData ?? []).map((g) => g.id as string);

  if (gigIds.length > 0) {
    const { data: p } = await supabaseAdmin
      .from('participations')
      .select('hours, status, gig_id')
      .in('gig_id', gigIds);
    participationsData = p as Array<Record<string, unknown>>;
  }

  const totalHours = (participationsData ?? [])
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.hours ?? 0), 0);

  const completedGigs = (gigsData ?? []).filter((g) => g.status === 'completed').length;

  const chartData = (gigsData ?? []).map((g) => ({
    // Sparse/legacy rows can miss these columns — never emit "undefined"/NaN.
    name: String(g.title ?? 'Gig').slice(0, 20),
    volunteers: Number(g.volunteers_joined ?? 0),
    completed: g.status === 'completed' ? 1 : 0,
  }));

  return {
    total_hours: totalHours,
    completed_gigs: completedGigs,
    total_gigs: gigsData?.length ?? 0,
    chart_data: chartData,
  };
}
