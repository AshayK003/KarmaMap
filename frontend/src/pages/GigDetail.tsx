import { AlertTriangle, Calendar, Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import { useRealtimeParticipations } from '../hooks/useRealtimeGigs';
import { supabase } from '../lib/supabase';
import { joinGigViaApi } from '../services/gigs';
import type { Gig } from '../types/database';
import { escapeIcsText, formatDate, safeIcsFilename } from '../utils/format';
import { parseGigLocation, skillOverlapScore } from '../utils/geo';
import { logger } from '../utils/logger';
import {
  getWeatherAdvisory,
  getWeatherDescription,
  type WeatherForecast,
  WeatherIcon,
} from '../components/Weather';

export function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [gig, setGig] = useState<Gig | null>(null);
  const [gigError, setGigError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [gigNotFound, setGigNotFound] = useState(false);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const volunteerCount = useRealtimeParticipations(id);

  useEffect(() => {
    if (!id) return;
    setGigError(null);
    supabase
      .from('gigs')
      .select('*, profiles:ngo_id(name)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setGigError(error.message);
          return;
        }
        if (!data) setGigNotFound(true);
        setGig(data as Gig | null);
      });
  }, [id]);

  useEffect(() => {
    if (!gig || !gig.location) return;

    // One parser for every location shape (WKT, GeoJSON, hex-WKB) — an inline
    // WKT-only regex silently skipped weather for Realtime/GeoJSON gigs.
    const parsed = parseGigLocation(gig.location);
    if (!parsed) return;
    const { lat, lng } = parsed;

    const cacheKey = `karmamap-weather-${lat.toFixed(2)}-${lng.toFixed(2)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 30 * 60 * 1000) {
          setWeather(parsed.data);
          return;
        }
      } catch {
        /* ignore stale cache */
      }
    }

    setLoadingWeather(true);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`,
    )
      .then((res) => {
        if (!res.ok) throw new Error('Weather API error');
        return res.json();
      })
      .then((data) => {
        if (data.daily && data.daily.time) {
          const gigDateObj = new Date(gig.gig_date);
          const gigDateStr = gigDateObj.toISOString().split('T')[0];

          // Try to find the matching forecast day
          const dayIndex = data.daily.time.indexOf(gigDateStr);
          let wf: WeatherForecast;

          if (dayIndex !== -1) {
            wf = {
              date: data.daily.time[dayIndex],
              weathercode: data.daily.weathercode[dayIndex],
              tempMax: data.daily.temperature_2m_max[dayIndex],
              tempMin: data.daily.temperature_2m_min[dayIndex],
              isGigDay: true,
            };
          } else {
            wf = {
              date: data.daily.time[0],
              weathercode: data.daily.weathercode[0],
              tempMax: data.daily.temperature_2m_max[0],
              tempMin: data.daily.temperature_2m_min[0],
              isGigDay: false,
            };
          }
          setWeather(wf);
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: wf, ts: Date.now() }));
        }
      })
      .catch((err) => logger.error('Error fetching weather:', err))
      .finally(() => setLoadingWeather(false));
  }, [gig]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    setJoinError(null);
    try {
      await joinGigViaApi(id);
      toast.success('Joined the gig! Head to participate page to upload photos.');
      navigate(`/gigs/${id}/participate`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join';
      toast.error(message);
      setJoinError(message);
    } finally {
      setJoining(false);
    }
  };

  if (gigNotFound) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <MapPin className="h-10 w-10 text-slate-300" />
          <h2 className="text-lg font-black text-slate-700 dark:text-slate-200">Gig Not Found</h2>
          <p className="text-xs font-semibold text-slate-400">
            This opportunity may have been removed or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  if (gigError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-black text-slate-700 dark:text-slate-200">
            Failed to load gig
          </h2>
          <p className="text-xs font-semibold text-slate-400">{gigError}</p>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-bold text-slate-400">Loading gig details…</p>
        </div>
      </div>
    );
  }

  const overlap =
    profile?.role === 'volunteer'
      ? skillOverlapScore(gig.required_skills ?? [], profile.skills ?? [])
      : 0;

  const advisory = getWeatherAdvisory(weather);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1 text-xs font-black text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>

      <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
        {gig.title}
      </h1>
      <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
        by {(gig as Gig & { profiles?: { name: string } }).profiles?.name ?? 'NGO'}
      </p>

      <p className="mt-5 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-2xs dark:shadow-none dark:shadow-slate-900/50 whitespace-pre-wrap">
        {gig.description}
      </p>

      {/* Skills requirements */}
      <div className="mt-5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-slate-400 block mb-2">
          Required Skills
        </span>
        <div className="flex flex-wrap gap-2">
          {(gig.required_skills ?? []).map((s) => {
            const hasSkill = profile?.skills?.some((ps) => ps.toLowerCase() === s.toLowerCase());
            return (
              <Badge
                key={s}
                variant={hasSkill ? 'default' : 'secondary'}
                className="gap-0.5 px-3 py-1.5 text-xs"
              >
                {hasSkill && (
                  <svg
                    className="h-3 w-3 mr-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {s}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Gorgeous 2-Column Dashboard details grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Spots & Matching */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Registration Stats
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                {volunteerCount || gig.volunteers_joined}
              </span>
              <span className="text-sm font-bold text-slate-400">
                / {gig.volunteers_needed} spots joined
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                style={{
                  width: `${Math.min(((volunteerCount || gig.volunteers_joined) / gig.volunteers_needed) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          {profile?.role === 'volunteer' && (
            <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Profile Match
              </span>
              <Badge
                variant={overlap >= 0.7 ? 'default' : overlap >= 0.4 ? 'amber' : 'secondary'}
                className="text-[10px] px-2.5 py-0.5"
              >
                {Math.round(overlap * 100)}% overlap
              </Badge>
            </div>
          )}
        </Card>

        {/* Right Column: Date & Live Weather */}
        <Card className="p-5 bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-800 dark:to-emerald-900/20 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Date & Planning
            </span>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">
              {formatDate(gig.gig_date, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 inline" />{' '}
              {formatDate(gig.gig_date, { hour: 'numeric', minute: '2-digit' })}
            </p>
            {gig.duration && (
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 inline" /> {gig.duration}h expected
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                const parsed = parseGigLocation(gig.location);
                const start = new Date(gig.gig_date);
                const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
                const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                const ics = [
                  'BEGIN:VCALENDAR',
                  'VERSION:2.0',
                  'PRODID:-//KarmaMap//EN',
                  'BEGIN:VEVENT',
                  `DTSTART:${fmt(start)}`,
                  `DTEND:${fmt(end)}`,
                  `SUMMARY:${escapeIcsText(gig.title)}`,
                  `DESCRIPTION:${escapeIcsText(gig.description)}`,
                  parsed ? `LOCATION:${parsed.lat},${parsed.lng}` : '',
                  `URL:${window.location.href}`,
                  'END:VEVENT',
                  'END:VCALENDAR',
                ]
                  .filter(Boolean)
                  .join('\r\n');
                const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = safeIcsFilename(gig.title);
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-colors cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Add to Calendar
            </button>
          </div>

          {/* Live Weather Widget */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            {loadingWeather ? (
              <Skeleton className="h-4 w-44" />
            ) : weather ? (
              <div className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 p-1 rounded-xl">
                    <WeatherIcon code={weather.weathercode} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                      {weather.isGigDay ? 'Gig Day Weather' : "Today's Weather"}
                    </span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {getWeatherDescription(weather.weathercode)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                    {Math.round(weather.tempMax)}°C
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block leading-tight">
                    Low {Math.round(weather.tempMin)}°C
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-400 italic">
                Weather forecast details unavailable
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Smart Weather Advisory Banner */}
      {advisory && (
        <div
          className={`mt-4 flex gap-3.5 rounded-2xl border p-4 shadow-2xs backdrop-blur-xs transition-all duration-300 ${advisory.bg}`}
        >
          <span className="shrink-0 animate-float">
            <advisory.icon className="h-6 w-6" />
          </span>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider">{advisory.title}</h4>
            <p className="text-xs font-semibold leading-relaxed opacity-95">
              {advisory.description}
            </p>
          </div>
        </div>
      )}

      {profile?.role === 'volunteer' && user ? (
        <div className="mt-6 space-y-2">
          {joinError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/50 px-4 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300">
              <svg
                className="h-4 w-4 shrink-0"
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
              {joinError}
            </div>
          )}
          <Button className="w-full" size="lg" onClick={handleJoin} disabled={joining}>
            {joining ? 'Joining…' : 'Join gig'}
          </Button>
        </div>
      ) : (
        !user && (
          <div className="mt-6">
            <Link to={`/login?next=${encodeURIComponent(`/gigs/${id}`)}`}>
              <Button className="w-full" size="lg" variant="outline">
                Sign in to join this gig
              </Button>
            </Link>
          </div>
        )
      )}
    </div>
  );
}
