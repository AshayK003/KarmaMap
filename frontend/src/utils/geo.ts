export const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
export const DEFAULT_RADIUS_METERS = 10000;

export function isStartingSoon(gigDate: string): boolean {
  const diff = new Date(gigDate).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

export function isFillingFast(joined: number, needed: number): boolean {
  if (needed <= 0) return false;
  return needed - joined <= Math.max(1, Math.round(needed * 0.2));
}

export function urgencyLabel(gig: {
  gig_date: string;
  volunteers_joined: number;
  volunteers_needed: number;
  featured_until?: string;
}): { label: string; variant: 'amber' | 'destructive' | 'default' } | null {
  if (gig.featured_until && new Date(gig.featured_until) > new Date()) {
    return { label: 'Featured', variant: 'amber' };
  }
  if (isStartingSoon(gig.gig_date)) {
    return { label: 'Starting Soon', variant: 'destructive' };
  }
  if (isFillingFast(gig.volunteers_joined, gig.volunteers_needed)) {
    return { label: 'Filling Fast', variant: 'amber' };
  }
  return null;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function skillOverlapScore(required: string[], volunteer: string[]): number {
  if (required.length === 0) return 100;
  const req = required.map((s) => s.toLowerCase());
  const matches = volunteer.filter((s) => req.includes(s.toLowerCase())).length;
  return Math.round((matches / required.length) * 100);
}

export function generatePortfolioSlug(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;
}

export function estimateTravelTime(meters: number): string {
  const km = meters / 1000;
  if (km < 1.5) {
    const walkMinutes = Math.round((km / 5) * 60);
    return `${walkMinutes} min walk`;
  }
  const driveMinutes = Math.round((km / 35) * 60);
  return `${driveMinutes} min drive`;
}

export function parseGigLocation(location: unknown): { lat: number; lng: number } | null {
  if (!location) return null;
  // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
  if (typeof location === 'object' && location !== null) {
    const obj = location as Record<string, unknown>;
    if (obj.type === 'Point' && Array.isArray(obj.coordinates) && obj.coordinates.length === 2) {
      return { lng: Number(obj.coordinates[0]), lat: Number(obj.coordinates[1]) };
    }
  }
  if (typeof location === 'string') {
    // E/WKT format: "SRID=4326;POINT(lng lat)" or "POINT(lng lat)"
    const wktMatch = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (wktMatch) return { lng: Number(wktMatch[1]), lat: Number(wktMatch[2]) };
    // Hex WKB format (from Supabase Realtime): 0101000020E6100000XXXX...YYYY...
    if (/^01[01]000020e6100000/i.test(location) && location.length >= 50) {
      const buf = new Uint8Array(8);
      for (let i = 0; i < 8; i++) buf[i] = parseInt(location.slice(18 + i * 2, 20 + i * 2), 16);
      const lng = new DataView(buf.buffer).getFloat64(0, true);
      for (let i = 0; i < 8; i++) buf[i] = parseInt(location.slice(34 + i * 2, 36 + i * 2), 16);
      const lat = new DataView(buf.buffer).getFloat64(0, true);
      if (isFinite(lng) && isFinite(lat)) return { lng, lat };
    }
  }
  return null;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}
