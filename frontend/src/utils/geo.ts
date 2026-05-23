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
