import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { joinGigViaApi } from '../services/gigs';
import { useRealtimeParticipations } from '../hooks/useRealtimeGigs';
import type { Gig } from '../types/database';
import { skillOverlapScore, parseGigLocation } from '../utils/geo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface WeatherForecast {
  date: string;
  weathercode: number;
  tempMax: number;
  tempMin: number;
  isGigDay: boolean;
}

function WeatherIcon({ code }: { code: number }) {
  // Clear Sky
  if (code === 0 || code === 1) {
    return (
      <svg className="h-8 w-8 text-amber-500 animate-spin" style={{ animationDuration: '10s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5" fill="#f59e0b" fillOpacity="0.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M18.364 18.364l-1.414-1.414M7.05 7.05L5.636 5.636" />
      </svg>
    );
  }
  // Partly Cloudy
  if (code === 2) {
    return (
      <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.02 0l-.707-.707M6.343 6.343l-.707-.707" className="text-amber-500" />
        <path strokeLinecap="round" strokeLinejoin="round" fill="#cbd5e1" fillOpacity="0.2" d="M19.4 15a1.65 1.65 0 00.33-1.82 2.2 2.2 0 00-2.5-1.28A4.4 4.4 0 008.5 13a3.85 3.85 0 00-.7 7.6h11.6a1.65 1.65 0 001.65-1.65 1.65 1.65 0 00-1.65-1.65v-2.3z" />
      </svg>
    );
  }
  // Cloudy/Overcast/Fog
  if (code === 3 || code === 45 || code === 48) {
    return (
      <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" fill="#cbd5e1" fillOpacity="0.3" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z" />
      </svg>
    );
  }
  // Rain/Drizzle
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return (
      <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" fill="#93c5fd" fillOpacity="0.2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-1 2m4-2l-1 2m4-2l-1 2" />
      </svg>
    );
  }
  // Snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return (
      <svg className="h-8 w-8 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" fill="#bae6fd" fillOpacity="0.2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 22h.01M12 22h.01M16 22h.01" />
      </svg>
    );
  }
  // Thunderstorm
  if (code >= 95) {
    return (
      <svg className="h-8 w-8 fill-none text-violet-500" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" fill="#c084fc" fillOpacity="0.2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 18l-3 4v-4H8l4-5v3h3l-2 2" className="text-amber-500 stroke-[2.5]" />
      </svg>
    );
  }
  // Default Overcast
  return (
    <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" fill="#cbd5e1" fillOpacity="0.2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.97 4 4 0 00-7.9 0A4 4 0 003 15z" />
    </svg>
  );
}

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if ([51, 53, 55].includes(code)) return 'Light Drizzle';
  if ([61, 63, 65].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77].includes(code)) return 'Snowy';
  if ([80, 81, 82].includes(code)) return 'Rain Showers';
  if ([85, 86].includes(code)) return 'Snow Showers';
  if (code >= 95) return 'Thunderstorms';
  return 'Cloudy';
}

export function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [gig, setGig] = useState<Gig | null>(null);
  const [joining, setJoining] = useState(false);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const volunteerCount = useRealtimeParticipations(id);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('gigs')
      .select('*, profiles:ngo_id(name)')
      .eq('id', id)
      .single()
      .then(({ data }) => setGig(data as Gig | null));
  }, [id]);

  useEffect(() => {
    if (!gig || !gig.location) return;

    const match = String(gig.location).match(/POINT\(([^ ]+) ([^ ]+)\)/);
    const lng = match ? parseFloat(match[1]) : null;
    const lat = match ? parseFloat(match[2]) : null;

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return;

    setLoadingWeather(true);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
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

          if (dayIndex !== -1) {
            setWeather({
              date: data.daily.time[dayIndex],
              weathercode: data.daily.weathercode[dayIndex],
              tempMax: data.daily.temperature_2m_max[dayIndex],
              tempMin: data.daily.temperature_2m_min[dayIndex],
              isGigDay: true,
            });
          } else {
            // Fallback: show today's forecast
            setWeather({
              date: data.daily.time[0],
              weathercode: data.daily.weathercode[0],
              tempMax: data.daily.temperature_2m_max[0],
              tempMin: data.daily.temperature_2m_min[0],
              isGigDay: false,
            });
          }
        }
      })
      .catch((err) => console.error('Error fetching weather:', err))
      .finally(() => setLoadingWeather(false));
  }, [gig]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    try {
      await joinGigViaApi(id);
      navigate(`/gigs/${id}/participate`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  if (!gig) {
    return <p className="p-8 text-center text-gray-500 dark:text-slate-400">Loading gig…</p>;
  }

  const overlap =
    profile?.role === 'volunteer'
      ? skillOverlapScore(gig.required_skills, profile.skills)
      : 0;

  const getWeatherAdvisory = () => {
    if (!weather) return null;
    const code = weather.weathercode;
    const tempMax = weather.tempMax;

    // Severe storms or heavy rain (codes 95+, or rain codes 63, 65, 81, 82)
    if (code >= 95 || [63, 65, 81, 82].includes(code)) {
      return {
        emoji: '⛈️',
        bg: 'bg-rose-50/70 border-rose-200/50 text-rose-800 shadow-rose-950/2 dark:bg-rose-900/30 dark:border-slate-700 dark:text-rose-300 dark:shadow-none',
        title: 'Severe Outdoor Advisory',
        description: 'Heavy rain, storms, or severe weather is forecast. We highly recommend bringing fully waterproof rainwear, an umbrella, and sturdy, slip-resistant footwear.',
      };
    }
    // Moderate rain or drizzle
    if ([51, 53, 55, 61, 80].includes(code)) {
      return {
        emoji: '☔',
        bg: 'bg-blue-50/70 border-blue-200/50 text-blue-800 shadow-blue-950/2 dark:bg-blue-900/30 dark:border-slate-700 dark:text-blue-200 dark:shadow-none',
        title: 'Wet Weather Preparedness',
        description: 'Light to moderate rain is expected. Consider bringing an umbrella or a rain jacket for outdoor activities.',
      };
    }
    // Extreme Heat
    if (tempMax > 35) {
      return {
        emoji: '☀️',
        bg: 'bg-amber-50/70 border-amber-200/50 text-amber-900 shadow-amber-950/2 dark:bg-amber-900/30 dark:border-slate-700 dark:text-amber-200 dark:shadow-none',
        title: 'Extreme Heat Advisory',
        description: 'Temperatures are forecast to exceed 35°C. Stay highly hydrated, wear a wide-brimmed hat, apply high-SPF sunscreen, and take breaks in shaded areas.',
      };
    }
    // Cold Freeze
    if (tempMax < 8) {
      return {
        emoji: '❄️',
        bg: 'bg-sky-50/70 border-sky-200/50 text-sky-900 shadow-sky-950/2 dark:bg-sky-900/30 dark:border-slate-700 dark:text-sky-200 dark:shadow-none',
        title: 'Low Temperature Advisory',
        description: 'Temperatures are forecast to be quite cold. We recommend dressing in warm, insulated layers and drinking warm fluids to stay safe outdoors.',
      };
    }
    // Beautiful clear day
    if (code === 0 || code === 1) {
      return {
        emoji: '✨',
        bg: 'bg-emerald-50/70 border-emerald-200/50 text-emerald-800 shadow-emerald-950/2 dark:bg-emerald-900/20 dark:border-slate-700 dark:text-slate-100 dark:shadow-none',
        title: 'Perfect Outdoor Weather',
        description: 'Beautiful clear skies are forecast! A wonderful day to head outdoors and make a positive impact in the community.',
      };
    }
    return null;
  };

  const advisory = getWeatherAdvisory();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1 text-xs font-black text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 leading-tight">{gig.title}</h1>
      <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
        by {(gig as Gig & { profiles?: { name: string } }).profiles?.name ?? 'NGO'}
      </p>
      
      <p className="mt-5 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-2xs dark:shadow-none dark:shadow-slate-900/50 whitespace-pre-wrap">
        {gig.description}
      </p>

      {/* Skills requirements */}
      <div className="mt-5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-slate-400 block mb-2">Required Skills</span>
        <div className="flex flex-wrap gap-2">
          {gig.required_skills.map((s) => {
            const hasSkill = profile?.skills?.some((ps) => ps.toLowerCase() === s.toLowerCase());
            return (
              <Badge key={s} variant={hasSkill ? 'default' : 'secondary'} className="gap-0.5 px-3 py-1.5 text-xs">
                {hasSkill && (
                  <svg className="h-3 w-3 mr-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
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
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Registration Stats</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{volunteerCount || gig.volunteers_joined}</span>
              <span className="text-sm font-bold text-slate-400">/ {gig.volunteers_needed} spots joined</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                style={{ width: `${Math.min(((volunteerCount || gig.volunteers_joined) / gig.volunteers_needed) * 100, 100)}%` }}
              />
            </div>
          </div>
          {profile?.role === 'volunteer' && (
            <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Profile Match</span>
              <Badge variant={overlap >= 70 ? 'default' : overlap >= 40 ? 'amber' : 'secondary'} className="text-[10px] px-2.5 py-0.5">
                {overlap}% overlap
              </Badge>
            </div>
          )}
        </Card>

          {/* Right Column: Date & Live Weather */}
          <Card className="p-5 bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-800 dark:to-emerald-900/20 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Date & Planning</span>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">
                {new Date(gig.gig_date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                🕒 {new Date(gig.gig_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </p>
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
                    `SUMMARY:${gig.title}`,
                    `DESCRIPTION:${gig.description.replace(/\n/g, '\\n')}`,
                    parsed ? `LOCATION:${parsed.lat},${parsed.lng}` : '',
                    `URL:${window.location.href}`,
                    'END:VEVENT',
                    'END:VCALENDAR',
                  ].filter(Boolean).join('\r\n');
                  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${gig.title.replace(/\s+/g, '_')}.ics`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-colors cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add to Calendar
              </button>
            </div>

            {/* Live Weather Widget */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            {loadingWeather ? (
              <span className="text-xs font-bold text-slate-400 animate-pulse">Checking weather conditions...</span>
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
              <span className="text-xs font-semibold text-slate-400 italic">Weather forecast details unavailable</span>
            )}
          </div>
        </Card>
      </div>

      {/* Smart Weather Advisory Banner */}
      {advisory && (
        <div className={`mt-4 flex gap-3.5 rounded-2xl border p-4.5 shadow-2xs backdrop-blur-xs transition-all duration-300 ${advisory.bg}`}>
          <span className="text-2xl shrink-0 select-none animate-float">{advisory.emoji}</span>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider">{advisory.title}</h4>
            <p className="text-xs font-semibold leading-relaxed opacity-95">{advisory.description}</p>
          </div>
        </div>
      )}

      {profile?.role === 'volunteer' && user && (
        <Button className="mt-6 w-full" size="lg" onClick={handleJoin} disabled={joining}>
          {joining ? 'Registering Opportunity...' : 'Join this gig & serve community'}
        </Button>
      )}
    </div>
  );
}
