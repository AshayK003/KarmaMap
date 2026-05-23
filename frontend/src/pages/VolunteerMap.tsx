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

function GigCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 w-3/4 rounded-full bg-slate-200" />
        <div className="h-4 w-14 rounded-full bg-slate-100 shrink-0" />
      </div>
      <div className="mt-2 h-3 w-1/3 rounded-full bg-slate-100" />
      <div className="mt-3 space-y-1.5">
        <div className="h-3 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-4/5 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 flex gap-1.5">
        <div className="h-5 w-16 rounded-lg bg-slate-100" />
        <div className="h-5 w-16 rounded-lg bg-slate-100" />
      </div>
      <div className="mt-4 h-1.5 w-full rounded-full bg-slate-100" />
      <div className="mt-4 h-8 w-full rounded-xl bg-slate-100" />
    </div>
  );
}

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
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50/40 to-white">
      {/* ── Page Header ── */}
      <div className="border-b border-emerald-100/60 bg-white/80 backdrop-blur-sm px-4 py-4">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-1.5">
              Discover Opportunities
              <svg className="h-5 w-5 text-emerald-600 animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </h1>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">
              Find volunteer gigs near you and make an impact today
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Gig count badge */}
            {!loading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {gigs.length} {gigs.length === 1 ? 'gig' : 'gigs'} found
              </span>
            )}
            <button
              type="button"
              onClick={loadGigs}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-emerald-500/10 hover:shadow-md transition-all duration-200 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {loading ? (
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89" />
                </svg>
              )}
              {loading ? 'Searching…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Split-Pane Body ── */}
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="flex flex-col lg:flex-row gap-5 lg:items-start">

          {/* ─── Left Sidebar ─── */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 space-y-4 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto lg:pr-1">

            {/* Location Picker Card */}
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
              mapHint="Tap the map on the right to move your pin"
            />

            {/* Radius pills */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">Search Radius</p>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRadius(opt.value)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all duration-200 ${
                      radius === opt.value
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gig list in sidebar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Nearby Opportunities</h2>
                {!loading && gigs.length > 0 && (
                  <span className="text-[10px] font-bold text-gray-400">{gigs.length} results</span>
                )}
              </div>

              {loading ? (
                <>
                  <GigCardSkeleton />
                  <GigCardSkeleton />
                  <GigCardSkeleton />
                </>
              ) : loadError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {loadError}
                </div>
              ) : gigs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-5 text-center space-y-2 flex flex-col items-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </span>
                  <p className="text-sm font-extrabold text-amber-900 mt-1">No open gigs nearby</p>
                  <ul className="text-xs font-semibold text-amber-700 text-left space-y-1.5 mt-2">
                    <li className="flex items-start gap-1.5"><span>→</span> Try a larger radius (50–100 km)</li>
                    <li className="flex items-start gap-1.5"><span>→</span> Use GPS or pick a different area</li>
                    <li className="flex items-start gap-1.5"><span>→</span> NGOs may not have posted gigs yet</li>
                  </ul>
                </div>
              ) : (
                gigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} volunteerSkills={profile?.skills} />
                ))
              )}
            </div>
          </div>

          {/* ─── Right: Full-Height Sticky Map ─── */}
          <div className="flex-1 lg:sticky lg:top-[76px]">
            <MapView
              lat={lat}
              lng={lng}
              gigs={gigs}
              radiusMeters={radius}
              height="calc(100vh - 96px)"
              pickMode
              onMapClick={setFromMap}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
