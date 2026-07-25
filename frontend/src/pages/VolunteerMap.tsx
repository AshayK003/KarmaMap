import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GigCard } from '../components/GigCard';
import { LocationPicker } from '../components/LocationPicker';
import { MapView } from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { useLocationPicker } from '../hooks/useLocationPicker';
import { supabase } from '../lib/supabase';
import { fetchNearbyGigs, updateProfileLocation } from '../services/gigs';
import type { NearbyGig } from '../types/database';
import { DEFAULT_RADIUS_METERS, skillOverlapScore } from '../utils/geo';

const RADIUS_OPTIONS = [
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
  { label: '100 km', value: 100000 },
];

function GigCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs dark:shadow-none dark:shadow-slate-900/50">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-14 shrink-0" />
      </div>
      <div className="mt-2">
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="mt-4 flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-lg" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-1.5 w-full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-8 w-full rounded-xl" />
      </div>
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
  const [sortMode, setSortMode] = useState<'nearest' | 'best_match'>('nearest');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const lastSavedLoc = useRef<{ lat: number; lng: number } | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadGigs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const locChanged =
        !lastSavedLoc.current ||
        lastSavedLoc.current.lat !== lat ||
        lastSavedLoc.current.lng !== lng;
      if (locChanged) {
        try {
          await updateProfileLocation(lat, lng);
        } catch {
          /* best-effort */
        }
        lastSavedLoc.current = { lat, lng };
      }
      const data = await fetchNearbyGigs(lat, lng, radius);
      setGigs(data);
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'Could not load gigs');
      setGigs([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius]);

  const debouncedLoadGigs = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(loadGigs, 400);
  }, [loadGigs]);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    gigs.forEach((g) => g.required_skills.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [gigs]);

  const filteredGigs = useMemo(() => {
    if (!categoryFilter) return gigs;
    return gigs.filter((g) =>
      g.required_skills.some((s) => s.toLowerCase() === categoryFilter.toLowerCase()),
    );
  }, [gigs, categoryFilter]);

  const sortedGigs = useMemo(() => {
    if (sortMode === 'nearest' || !profile?.skills) return filteredGigs;
    const withScore = filteredGigs.map((g) => ({
      ...g,
      matchScore: skillOverlapScore(g.required_skills, profile.skills),
    }));
    withScore.sort((a, b) => {
      if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
      return a.distance_meters - b.distance_meters;
    });
    return withScore;
  }, [filteredGigs, sortMode, profile?.skills]);

  useEffect(() => {
    if (geoLoading && source === 'gps') return;
    debouncedLoadGigs();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [debouncedLoadGigs, geoLoading, source]);

  useEffect(() => {
    const channel = supabase
      .channel('volunteer-gig-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gigs', filter: 'status=eq.open' },
        debouncedLoadGigs,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gigs', filter: 'status=eq.open' },
        debouncedLoadGigs,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [debouncedLoadGigs]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50/40 to-white dark:from-slate-900 dark:to-slate-900">
      {/* ── Page Header ── */}
      <div className="border-b border-emerald-100/60 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-4">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
              Discover Opportunities
              <svg
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-float"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </h1>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 mt-0.5">
              Find volunteer gigs near you and make an impact today
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Gig count badge */}
            {!loading && (
              <Badge variant="default" className="gap-1.5 px-3 py-1 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {sortedGigs.length} {sortedGigs.length === 1 ? 'gig' : 'gigs'} found
              </Badge>
            )}

            <Button size="sm" onClick={loadGigs} disabled={loading}>
              {loading ? 'Searching…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Split-Pane Body ── */}
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="flex flex-col lg:flex-row gap-5 lg:items-start">
          {/* ─── Map (renders first on mobile, second on desktop) ─── */}
          <div className="flex-1 order-first lg:order-2 lg:sticky lg:top-[76px] h-[50vh] min-h-[300px] lg:h-[calc(100vh-96px)]">
            <MapView
              lat={lat}
              lng={lng}
              gigs={sortedGigs}
              radiusMeters={radius}
              height="100%"
              pickMode
              onMapClick={setFromMap}
              refreshCounter={refreshCounter}
            />
          </div>

          {/* ─── Sidebar (renders second on mobile, first on desktop) ─── */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 space-y-4 order-last lg:order-1 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto lg:pr-1">
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
            <Card className="p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-slate-400 mb-3">
                Search Radius
              </p>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={radius === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRadius(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Sort mode */}
            <Card className="p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-slate-400 mb-3">
                Sort By
              </p>
              <div className="flex gap-2">
                <Button
                  variant={sortMode === 'nearest' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortMode('nearest')}
                >
                  Nearest
                </Button>
                <Button
                  variant={sortMode === 'best_match' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortMode('best_match')}
                  disabled={!profile?.skills || profile.skills.length === 0}
                  title={
                    !profile?.skills?.length
                      ? 'Add skills in your portfolio to use Best Match'
                      : 'Sort by skill relevance'
                  }
                >
                  Best Match
                </Button>
              </div>
              {sortMode === 'best_match' && profile?.skills && profile.skills.length > 0 && (
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  Sorted by skill relevance
                </p>
              )}
            </Card>

            {/* Category filters */}
            {allSkills.length > 0 && (
              <Card className="p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-slate-400 mb-2">
                  Filter by Category
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter(null)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-colors ${
                      categoryFilter === null
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    All
                  </button>
                  {allSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => setCategoryFilter(categoryFilter === skill ? null : skill)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-colors ${
                        categoryFilter === skill
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Gig list in sidebar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 dark:text-slate-400">
                  {categoryFilter ? categoryFilter : 'All'} Opportunities
                </h2>
                {!loading && sortedGigs.length > 0 && (
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400">
                    {sortedGigs.length} results
                  </span>
                )}
              </div>

              {loading ? (
                <>
                  <GigCardSkeleton />
                  <GigCardSkeleton />
                  <GigCardSkeleton />
                </>
              ) : loadError ? (
                <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/30 p-4 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-rose-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  {loadError}
                </div>
              ) : sortedGigs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/30 p-5 text-center space-y-2 flex flex-col items-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </span>
                  <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200 mt-1">
                    No {categoryFilter ? `${categoryFilter} ` : ''}gigs nearby
                  </p>
                  <ul className="text-xs font-semibold text-amber-700 dark:text-amber-300 text-left space-y-1.5 mt-2">
                    <li className="flex items-start gap-1.5">
                      <span>→</span> Try a larger radius (50–100 km)
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span>→</span> Use GPS or pick a different area
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span>→</span> NGOs may not have posted gigs yet
                    </li>
                  </ul>
                </div>
              ) : (
                sortedGigs.map((gig) => (
                  <div key={gig.id}>
                    <GigCard gig={gig} volunteerSkills={profile?.skills} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
