import { logger } from '../src/lib/logger.js';
import { supabaseAdmin } from './supabase.js';

export interface MatchedVolunteer {
  id: string;
  name: string;
  email: string;
  skills: string[];
  distance_meters: number;
  skill_overlap: number;
  final_score: number;
}

export function skillOverlap(required: string[], volunteer: string[]): number {
  if (required.length === 0) return 1;
  const requiredLower = required.map((s) => s.toLowerCase());
  const matches = volunteer.filter((s) => requiredLower.includes(s.toLowerCase())).length;
  return matches / required.length;
}

export function normalizeDistance(distanceMeters: number, maxMeters = 50000): number {
  return Math.min(1, Math.max(0, 1 - distanceMeters / maxMeters));
}

export async function findMatchedVolunteers(
  gigId: string,
  radiusMeters = 10000,
  limit = 10,
): Promise<MatchedVolunteer[]> {
  const { data: gig, error: gigError } = await supabaseAdmin
    .from('gigs')
    .select('id, required_skills, location')
    .eq('id', gigId)
    .single();

  if (gigError || !gig) {
    throw new Error('Gig not found');
  }

  const { data: volunteers, error } = await supabaseAdmin.rpc('nearby_volunteers_for_gig', {
    p_gig_id: gigId,
    p_radius_meters: radiusMeters,
  });

  if (error) {
    return matchVolunteersFallback(gigId, gig.required_skills ?? [], radiusMeters, limit);
  }

  const ranked = (volunteers ?? []).map(
    (v: { id: string; name: string; email: string; skills: string[]; distance_meters: number }) => {
      const overlap = skillOverlap(gig.required_skills ?? [], v.skills ?? []);
      const distScore = normalizeDistance(v.distance_meters);
      const final_score = 0.5 * distScore + 0.5 * overlap;
      return { ...v, skill_overlap: overlap, final_score };
    },
  );

  return ranked
    .sort((a: MatchedVolunteer, b: MatchedVolunteer) => b.final_score - a.final_score)
    .slice(0, limit);
}

async function matchVolunteersFallback(
  _gigId: string,
  requiredSkills: string[],
  _radiusMeters: number,
  limit: number,
): Promise<MatchedVolunteer[]> {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, skills')
    .eq('role', 'volunteer')
    .not('location', 'is', null)
    .limit(limit * 5);

  return (profiles ?? [])
    .map((v) => {
      const overlap = skillOverlap(requiredSkills, v.skills ?? []);
      return {
        id: v.id,
        name: v.name,
        email: '',
        skills: v.skills ?? [],
        distance_meters: 5000,
        skill_overlap: overlap,
        final_score: overlap * 0.5 + 0.25,
      };
    })
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, limit);
}

export async function notifyMatchedVolunteers(
  gigId: string,
  volunteers: MatchedVolunteer[],
  gigTitle: string,
): Promise<void> {
  const notifications = volunteers.map((v) => ({
    user_id: v.id,
    message: `New gig nearby: "${gigTitle}" — you're a top match!`,
    gig_id: gigId,
    read_status: false,
  }));

  if (notifications.length === 0) return;
  const { error } = await supabaseAdmin.from('notifications').insert(notifications);
  if (error) {
    logger.warn({ gigId, error: error.message }, 'Failed to notify matched volunteers');
  }
}
