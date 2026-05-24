/**
 * Free place search via Photon (OpenStreetMap data).
 * No API key — https://photon.komoot.io
 * Fair use: debounce requests; not for heavy bulk geocoding.
 */

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

function formatPhotonLabel(props: PhotonFeature['properties']): string {
  const parts = [
    props.name,
    props.street,
    props.city,
    props.state,
    props.country,
  ].filter((p, i, arr) => p && arr.indexOf(p) === i);
  return parts.join(', ') || 'Selected place';
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '8');
  url.searchParams.set('lang', 'en');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error('Place search unavailable. Try again or use coordinates.');
  }

  const data = (await res.json()) as { features: PhotonFeature[] };

  return (data.features ?? []).map((f) => ({
    label: formatPhotonLabel(f.properties),
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}
