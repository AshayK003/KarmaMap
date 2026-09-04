import { Flame, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface LeaderboardEntry {
  name: string;
  karma_points: number;
  streak: number;
}

const TIER_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

export function Leaderboard() {
  const [volunteers, setVolunteers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  // A failed fetch previously rendered "No volunteers ranked yet" — a lie.
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const CACHE_KEY = 'karmamap-leaderboard';
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 60000) {
          setVolunteers(parsed.data);
          setLoading(false);
          return;
        }
      } catch {
        /* ignore */
      }
    }

    setLoadError(false);
    Promise.resolve(
      supabase
        .from('profiles')
        .select('name, karma_points, streak')
        .eq('role', 'volunteer')
        .not('karma_points', 'is', null)
        .order('karma_points', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (error) throw error;
          const entries = (data as LeaderboardEntry[]) ?? [];
          setVolunteers(entries);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: entries, ts: Date.now() }));
        }),
    )
      .catch((err: unknown) => {
        logger.error('Failed to fetch leaderboard:', err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [retryCount]);

  const chartData = volunteers.slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Volunteer Leaderboard
        </h1>
        <p className="text-sm font-semibold text-slate-400 mt-1">
          Top volunteers ranked by total Karma Points.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 p-8 text-center space-y-3">
          <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300">
            Couldn't load the leaderboard
          </p>
          <p className="text-xs font-semibold text-slate-400">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRetryCount((c) => c + 1);
            }}
            className="text-xs font-black text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            Retry
          </button>
        </div>
      ) : volunteers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 p-8 text-center">
          <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300">
            No volunteers ranked yet
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-2">
            {volunteers.map((v, i) => {
              const isTop3 = i < 3;
              return (
                <div
                  key={v.name + i}
                  className={`flex items-center gap-4 rounded-2xl border p-4 shadow-xs dark:shadow-none dark:shadow-slate-900/50 transition-all hover:shadow-md ${
                    isTop3
                      ? 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-slate-700'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black">
                    {isTop3 ? (
                      <Trophy
                        className={`h-5 w-5 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`}
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-400">#{i + 1}</span>
                    )}
                  </span>
                  <Avatar
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(v.name)}&backgroundType=gradientLinear&fontSize=42`}
                    alt={v.name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                      {v.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="default" className="text-[10px] px-2 py-0.5">
                        <Sparkles className="h-3 w-3 inline" /> {v.karma_points} Karma
                      </Badge>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Flame className="h-3 w-3 inline" /> {v.streak} day streak
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs dark:shadow-none dark:shadow-slate-900/50">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                Top 10 by Karma
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                    formatter={(value) => [`${value} Karma`, 'Points']}
                  />
                  <Bar dataKey="karma_points" radius={[0, 8, 8, 0]} barSize={20}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={TIER_COLORS[Math.min(i, TIER_COLORS.length - 1)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
