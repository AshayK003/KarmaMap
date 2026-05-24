export const DEFAULT_CENTER: [number, number] = [28.6139, 77.209]; // Delhi fallback
export const DEFAULT_RADIUS_METERS = 10000;

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function skillOverlapScore(
  required: string[],
  volunteer: string[]
): number {
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
  // E/WKT format: "SRID=4326;POINT(lng lat)" or "POINT(lng lat)"
  if (typeof location === 'string') {
    const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (match) return { lng: Number(match[1]), lat: Number(match[2]) };
  }
  return null;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}

