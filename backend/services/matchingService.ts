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

/** Haversine distance in meters between two coordinates. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parsePoint(location: unknown): { lat: number; lng: number } | null {
  if (typeof location !== 'string') return null;
  const m = location.match(/POINT\(([-\d.eE+]+)\s+([-\d.eE+]+)\)/i);
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
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
    logger.warn(
      { gigId, error: error.message },
      'nearby_volunteers_for_gig unavailable, using unranked fallback',
    );
    return matchVolunteersFallback(
      gig.required_skills ?? [],
      parsePoint(gig.location),
      radiusMeters,
      limit,
    );
  }

  const ranked = (volunteers ?? []).map(
    (v: { id: string; name: string; email: string; skills: string[]; distance_meters: number }) => {
      const overlap = skillOverlap(gig.required_skills ?? [], v.skills ?? []);
      // Score proximity against the requested radius so the edge scores 0 —
      // the default 50km scale previously over-scored distant volunteers.
      const distScore = normalizeDistance(v.distance_meters, radiusMeters);
      const final_score = 0.5 * distScore + 0.5 * overlap;
      return { ...v, skill_overlap: overlap, final_score };
    },
  );

  return ranked
    .sort((a: MatchedVolunteer, b: MatchedVolunteer) => b.final_score - a.final_score)
    .slice(0, limit);
}

/**
 * Fallback used only when the PostGIS RPC is unavailable. Computes real
 * haversine distances from stored WKT coordinates and enforces the requested
 * radius, instead of returning fabricated distances.
 */
async function matchVolunteersFallback(
  requiredSkills: string[],
  gigPoint: { lat: number; lng: number } | null,
  radiusMeters: number,
  limit: number,
): Promise<MatchedVolunteer[]> {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, name, skills, location')
    .eq('role', 'volunteer')
    .not('location', 'is', null)
    .limit(limit * 10);

  if (error) {
    logger.error({ error: error.message }, 'Matching fallback query failed');
    return [];
  }

  const matches: MatchedVolunteer[] = [];
  for (const v of profiles ?? []) {
    const point = parsePoint(v.location);
    // Without the RPC we cannot resolve emails; leave empty rather than guess.
    const base = {
      id: v.id,
      name: v.name,
      email: '',
      skills: v.skills ?? [],
      skill_overlap: skillOverlap(requiredSkills, v.skills ?? []),
    };
    if (gigPoint && point) {
      const distance = haversineMeters(gigPoint.lat, gigPoint.lng, point.lat, point.lng);
      if (distance > radiusMeters) continue;
      matches.push({
        ...base,
        distance_meters: Math.round(distance),
        final_score: 0.5 * normalizeDistance(distance, radiusMeters) + 0.5 * base.skill_overlap,
      });
    } else {
      // No usable coordinates on either side: include with unknown distance.
      matches.push({
        ...base,
        distance_meters: -1,
        final_score: 0.5 * base.skill_overlap,
      });
    }
  }

  return matches.sort((a, b) => b.final_score - a.final_score).slice(0, limit);
}

export async function notifyMatchedVolunteers(
  gigId: string,
  volunteers: MatchedVolunteer[],
  gigTitle: string,
): Promise<void> {
  const notifications = volunteers
    .filter((v) => v.distance_meters >= 0)
    .map((v) => ({
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
