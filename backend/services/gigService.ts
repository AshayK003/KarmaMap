import { supabaseAdmin } from './supabase.js';
import { logger } from '../src/lib/logger.js';
import { enqueueMatching } from './queue.js';
import { getCached, setCache } from '../src/lib/cache.js';

export interface CreateGigInput {
  title: string;
  description: string;
  lat: number;
  lng: number;
  required_skills: string[];
  volunteers_needed: number;
  gig_date: string;
  location_label?: string;
}

interface UpdateGigInput {
  title: string;
  description: string;
  lat: number;
  lng: number;
  required_skills: string[];
  volunteers_needed: number;
  gig_date: string;
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
    p_location_label: input.location_label ?? '',
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !data.id || typeof data.id !== 'string') {
    throw new Error('Gig creation RPC returned no valid id');
  }

  const gigId = data.id as string;
  const queued = await enqueueMatching(gigId, input.title);
  if (!queued) {
    try {
      const { findMatchedVolunteers, notifyMatchedVolunteers } = await import('./matchingService.js');
      const { sendGigMatchEmails } = await import('./emailService.js');
      const matched = await findMatchedVolunteers(data.id);
      await notifyMatchedVolunteers(data.id, matched, input.title);
      await sendGigMatchEmails(matched, input.title);
      return { gig: data, matched_count: matched.length };
    } catch (matchErr) {
      logger.warn({ gigId, error: (matchErr as Error).message }, 'Matching skipped after gig creation');
      return { gig: data, matched_count: 0 };
    }
  }

  return { gig: data, matched_count: 0 };
}

export async function updateGig(
  gigId: string,
  ngoId: string,
  input: UpdateGigInput
): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin.rpc('update_gig', {
    p_gig_id: gigId,
    p_title: input.title,
    p_description: input.description,
    p_lat: input.lat,
    p_lng: input.lng,
    p_required_skills: input.required_skills,
    p_volunteers_needed: input.volunteers_needed,
    p_gig_date: input.gig_date,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Update RPC returned no data');
  return data as Record<string, unknown>;
}

export async function getNgoAnalytics(ngoId: string): Promise<AnalyticsResult> {
  const cacheKey = `analytics-${ngoId}`;
  const cached = getCached<AnalyticsResult>(cacheKey);
  if (cached) return cached;

  // Try aggregated RPC first (returns JSON), fall back to manual joins
  let gigsData: Array<Record<string, unknown>> | null = null;
  let participationsData: Array<Record<string, unknown>> | null = null;

  try {
    const { data: agg, error } = await supabaseAdmin.rpc('get_ngo_analytics', {
      p_ngo_id: ngoId,
    });
    if (!error && agg && typeof agg === 'object' && 'total_gigs' in (agg as Record<string, unknown>)) {
      const result = agg as unknown as AnalyticsResult;
      if (result.total_gigs > 0 || result.total_hours > 0 || result.completed_gigs > 0) {
        setCache<AnalyticsResult>(cacheKey, result);
        return result;
      }
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
    name: String(g.title).slice(0, 20),
    volunteers: Number(g.volunteers_joined),
    completed: g.status === 'completed' ? 1 : 0,
  }));

  const result: AnalyticsResult = {
    total_hours: totalHours,
    completed_gigs: completedGigs,
    total_gigs: gigsData?.length ?? 0,
    chart_data: chartData,
  };
  setCache<AnalyticsResult>(cacheKey, result);
  return result;
}
