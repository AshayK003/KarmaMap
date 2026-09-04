import { supabase } from '../lib/supabase';
import type { Gig, GigStatus, NearbyGig } from '../types/database';
import { apiFetch } from '../utils/api';

export async function fetchNearbyGigs(
  lat: number,
  lng: number,
  radiusMeters = 10000,
): Promise<NearbyGig[]> {
  const { data, error } = await supabase.rpc('nearby_gigs', {
    lat,
    lng,
    radius_meters: radiusMeters,
  } as { lat: number; lng: number; radius_meters: number });

  if (error) throw error;
  return (data as NearbyGig[]) ?? [];
}

export async function createGigViaApi(payload: {
  title: string;
  description: string;
  lat: number;
  lng: number;
  required_skills: string[];
  volunteers_needed: number;
  gig_date: string;
  location_label?: string;
  duration?: number;
}) {
  return apiFetch<{ gig: unknown }>('/api/gigs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProfileLocation(lat: number, lng: number) {
  const { error } = await supabase.rpc('update_profile_location', {
    lat,
    lng,
  } as { lat: number; lng: number });
  if (error) throw error;
}

export async function joinGigViaApi(gigId: string) {
  return apiFetch(`/api/participations/join/${gigId}`, { method: 'POST' });
}

export async function completeParticipationViaApi(
  participationId: string,
  payload: {
    hours: number;
    before_photo_url?: string;
    after_photo_url?: string;
  },
) {
  return apiFetch<{ participation: unknown; karma_earned: number }>(
    `/api/participations/${participationId}/complete`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function updateGigStatus(gigId: string, status: GigStatus) {
  // Status moves go through the backend so illegal transitions
  // (e.g. completed → open) are rejected instead of written directly.
  const { gig } = await apiFetch<{ gig: Gig }>(`/api/gigs/${gigId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return gig;
}

export async function fetchNgoAnalytics() {
  return apiFetch<{
    total_hours: number;
    completed_gigs: number;
    total_gigs: number;
    chart_data: Array<{ name: string; volunteers: number; completed: number }>;
  }>('/api/gigs/analytics');
}
