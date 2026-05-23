import { useCallback, useEffect, useState } from 'react';
import { MapView } from '../components/MapView';
import { GigCard } from '../components/GigCard';
import { LocationPicker } from '../components/LocationPicker';
import { useLocationPicker } from '../hooks/useLocationPicker';
import { useAuth } from '../context/AuthContext';
import { fetchNearbyGigs, updateProfileLocation } from '../services/gigs';
import type { NearbyGig } from '../types/database';
import { DEFAULT_RADIUS_METERS } from '../utils/geo';

const RADIUS_OPTIONS = [
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
  { label: '100 km', value: 100000 },
];

export function VolunteerMap() {
  const {
    lat,
    lng,
    source,
    geoError,
    geoLoading,
    setLocation,
    useGps,
    usePreset,
    setFromMap,
    setFromSearch,
    placeLabel,
  } = useLocationPicker();
  const { profile } = useAuth();
  const [gigs, setGigs] = useState<NearbyGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_METERS);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadGigs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await updateProfileLocation(lat, lng);
      const data = await fetchNearbyGigs(lat, lng, radius);
      setGigs(data);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'Could not load gigs');
      setGigs([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius]);

  useEffect(() => {
    if (geoLoading && source === 'gps') return;
    loadGigs();
  }, [loadGigs, geoLoading, source]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Nearby Gigs</h1>
        <button
          type="button"
          onClick={loadGigs}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
        >
          Search again
        </button>
      </div>

      <div className="mt-4">
        <LocationPicker
          lat={lat}
          lng={lng}
          source={source}
          placeLabel={placeLabel}
          geoError={geoError}
          onUseGps={useGps}
          onPreset={usePreset}
          onManualApply={(a, b) => setLocation(a, b, 'manual')}
          onSearchSelect={setFromSearch}
          mapHint="Tap the map to move your search point"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">Search radius:</span>
        {RADIUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRadius(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              radius === opt.value
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <MapView
          lat={lat}
          lng={lng}
          gigs={gigs}
          radiusMeters={radius}
          pickMode
          onMapClick={setFromMap}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-semibold">Gig list</h2>
        {loading ? (
          <p className="text-gray-500">Loading gigs…</p>
        ) : loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : gigs.length === 0 ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">No open gigs in this area.</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
              <li>NGO must create a gig at the <strong>same location</strong> (use Lucknow preset on both sides).</li>
              <li>Try a larger radius (50–100 km) for testing.</li>
              <li>In Supabase, check <code className="rounded bg-white px-1">gigs</code> has rows with{' '}
                <code className="rounded bg-white px-1">status = open</code>.
              </li>
            </ul>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} volunteerSkills={profile?.skills} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
