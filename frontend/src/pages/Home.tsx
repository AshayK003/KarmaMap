import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface Stats {
  totalHours: number;
  ngoCount: number;
  openGigs: number;
}

const CACHE_KEY = 'karmamap-home-stats';
const CACHE_TTL_MS = 60_000;

export function Home() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalHours: 0, ngoCount: 0, openGigs: 0 });

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { data: Stats; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          setStats(parsed.data);
          return;
        }
      } catch {
        /* ignore malformed cache */
      }
    }

    Promise.resolve(
      supabase
        .rpc('get_public_stats')
        .then(({ data, error }) => {
          if (error || !data) throw new Error(error?.message ?? 'stats unavailable');
          const newStats: Stats = {
            // Postgres numerics arrive as strings through the REST layer.
            totalHours: Number(data.total_hours ?? 0),
            ngoCount: Number(data.ngo_count ?? 0),
            openGigs: Number(data.open_gigs ?? 0),
          };
          setStats(newStats);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: newStats, ts: Date.now() }));
        }),
    ).catch((err: unknown) => logger.error('Failed to fetch home stats:', err));
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-emerald-50/20 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      {/* Glow Blur Blobs */}
      <div className="absolute top-1/4 left-1/10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/10 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none animate-float" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-10">
        {/* ─── Hero Section ─── */}
        <section className="text-center space-y-6">
          <Badge variant="default" className="px-3.5 py-1 text-xs gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Hyper-Local Geospatial Volunteer Network
          </Badge>

          <h1 className="text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100 sm:text-6xl max-w-4xl mx-auto leading-[1.1]">
            Volunteer Locally.
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Impact Globally.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            KarmaMap connects verified local NGOs with skilled volunteers using intelligent
            geospatial coordinates, dynamic matching algorithms, and automated completion
            verification.
          </p>

          {user && profile ? (
            <div className="pt-4">
              <Link to={profile.role === 'ngo' ? '/ngo/dashboard' : '/map'}>
                <Button size="lg">
                  Go to {profile.role === 'ngo' ? 'NGO Dashboard' : 'Discovery Map'}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link to="/signup?role=volunteer">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Join as Volunteer
                </Button>
              </Link>
              <Link to="/signup?role=ngo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Register NGO Organization
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* ─── Stats Grid Section ─── */}
        <section className="mt-20 border-y border-slate-100 dark:border-slate-700 py-10 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xs rounded-3xl px-6 grid gap-8 sm:grid-cols-3 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-slate-100">
              {stats.totalHours.toLocaleString()}+
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Hours Logged
            </p>
          </div>
          <div className="border-y sm:border-y-0 sm:border-x border-slate-100 dark:border-slate-700 py-6 sm:py-0">
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.openGigs}+
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Open Opportunities
            </p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-slate-100">
              {stats.ngoCount}+
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Verified Partners
            </p>
          </div>
        </section>

        {/* ─── Features Grid ─── */}
        <section className="mt-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 sm:text-3xl">
              Engineered for Community Impact
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-1">
              Advanced technologies driving local transformations daily.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                title: 'Map Discovery',
                desc: 'Find open volunteer opportunities within custom search radii on an interactive live map.',
                svg: (
                  <svg
                    className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                ),
              },
              {
                title: 'Smart Skill Matching',
                desc: 'Instant matching system that dynamically aligns opportunity requirements with volunteer skills.',
                svg: (
                  <svg
                    className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ),
              },
              {
                title: 'Verified Impact Ledger',
                desc: 'Cryptographically secured records detailing completed service hours and downloadable certificates.',
                svg: (
                  <svg
                    className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                ),
              },
            ].map((f) => (
              <Card
                key={f.title}
                className="group p-6 hover:shadow-md dark:shadow-none dark:shadow-slate-900/50 hover:border-emerald-100/50 transition-all duration-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-200">
                  {f.svg}
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {f.title}
                </h3>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-normal">
                  {f.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
