import { useEffect, useState } from 'react';
import { formatDate } from '../utils/format';
import { getKarmaLevel } from '../utils/karma';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import type { Profile, Participation } from '../types/database';

export function PublicPortfolio() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completed, setCompleted] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    Promise.resolve(
      supabase
        .from('profiles')
        .select('*')
        .eq('portfolio_slug', slug)
        .single()
        .then(({ data }) => {
          setProfile(data);
          if (data) {
            Promise.resolve(
              supabase
                .from('participations')
                .select('*, gigs(title, gig_date)')
                .eq('volunteer_id', data.id)
                .eq('status', 'completed')
                .then(({ data: parts }) => {
                  setCompleted((parts as Participation[]) ?? []);
                  setLoading(false);
                })
            ).catch((err: unknown) => {
              console.error('Failed to fetch participations:', err);
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        })
    ).catch((err: unknown) => {
      console.error('Failed to fetch profile:', err);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gradient-to-b from-emerald-50/40 to-white dark:from-slate-900 dark:to-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-emerald-600 dark:border-t-emerald-400" />
          <p className="text-xs font-bold text-slate-400">Loading verified portfolio...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gradient-to-b from-emerald-50/40 to-white dark:from-slate-900 dark:to-slate-900">
        <div className="text-center space-y-2">
          <span className="text-4xl select-none">🗺️</span>
          <h2 className="text-lg font-black text-slate-700 dark:text-slate-200">Portfolio Not Found</h2>
          <p className="text-xs font-semibold text-slate-400">
            The profile link may be incorrect, or the volunteer has disabled sharing.
          </p>
        </div>
      </div>
    );
  }

  const totalHours = completed.reduce((s, p) => s + Number(p.hours ?? 0), 0);

  // Dynamic Karma Level calculation
  const karma = profile.karma_points ?? 0;
  const level = getKarmaLevel(karma);
  const nextMilestonePercent = Math.min(100, (karma / level.max) * 100);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50/30 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Verified Status Banner */}
      <div className="mx-auto max-w-5xl mb-6 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 shadow-md text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-slate-900 font-extrabold animate-pulse">
            ✓
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
            Verified KarmaMap Profile
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
          Verified Impact Log
        </span>
      </div>

      <div className="mx-auto max-w-5xl grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* ─── Left Column: Profile Card & QR Share ─── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Main Public Profile Info Card */}
          <Card className="bg-white dark:bg-slate-800 text-center">
            {/* Avatar block */}
            <div className="flex flex-col items-center">
              <div className={`relative rounded-full bg-gradient-to-tr ${level.color} p-1 shadow-lg`}>
                <Avatar
                  size="xl"
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || 'VM')}&backgroundType=gradientLinear&fontSize=42`}
                  alt={profile.name}
                />
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 dark:bg-slate-900 text-sm shadow-md dark:shadow-none dark:shadow-slate-900/50 border-2 border-white dark:border-slate-700 select-none">
                  🛡️
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-black text-slate-800 dark:text-slate-100">{profile.name}</h1>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${level.color} px-4 py-1 text-xs font-extrabold text-white shadow-xs dark:shadow-none dark:shadow-slate-900/50`}>
                {level.title}
              </span>
            </div>

            {/* Bio Section */}
            {profile.bio && (
              <div className="mt-6 border-t border-slate-100/80 dark:border-slate-700 pt-5 text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">
                  Biography
                </span>
                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 italic">
                  "{profile.bio}"
                </p>
              </div>
            )}

            {/* Skills Badges */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-6 border-t border-slate-100/80 dark:border-slate-700 pt-5 text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-3">
                  Registered Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300"
                    >
                      🌱 {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

        </div>

        {/* ─── Right Column: Stats & Timeline ─── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metrics Overview Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Karma */}
            <Card className="relative overflow-hidden bg-white dark:bg-slate-800 p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Karma</span>
                <span className="text-xl">✨</span>
              </div>
              <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">{profile.karma_points ?? 0}</p>
              {/* Level Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-1">
                  <span>Next Milestone</span>
                  <span>{karma}/{level.max} XP</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200/50 dark:border-slate-600/50">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${level.color} transition-all duration-500`}
                    style={{ width: `${nextMilestonePercent}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Streak */}
            <Card className="relative overflow-hidden bg-white dark:bg-slate-800 p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-amber-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">Active Streak</span>
                <span className="text-xl animate-float">🔥</span>
              </div>
              <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">{profile.streak ?? 0} days</p>
              <p className="mt-4 text-[10px] font-bold text-slate-400 leading-normal">
                Shows active engagement and reliable daily community service.
              </p>
            </Card>

            {/* Hours */}
            <Card className="relative overflow-hidden bg-white dark:bg-slate-800 p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-blue-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Verified Time</span>
                <span className="text-xl">⏳</span>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{totalHours}h</p>
              <p className="mt-4 text-[10px] font-bold text-slate-400 leading-normal">
                Total accumulated volunteer time verified across open NGO projects.
              </p>
            </Card>
          </div>

          {/* Completed Gigs list */}
          <Card className="bg-white dark:bg-slate-800">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>📋</span> Volunteer History & Accomplishments
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Chronological log of volunteer participations and impact milestones.
            </p>

            <div className="mt-6 space-y-4">
              {completed.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 p-8 text-center">
                  <span className="text-3xl select-none">🌱</span>
                  <p className="mt-2 text-sm font-extrabold text-slate-600 dark:text-slate-300">No verified history found</p>
                  <p className="text-xs font-medium text-slate-400 mt-1 max-w-xs mx-auto">
                    This volunteer has not logged any completed events on their public page yet.
                  </p>
                </div>
              ) : (
                completed.map((p) => {
                  const gigTitle = (p as Participation & { gigs?: { title: string } }).gigs?.title ?? 'Volunteer Gig';
                  const rawDate = (p as Participation & { gigs?: { gig_date: string } }).gigs?.gig_date;
                  const dateStr = rawDate
                    ? formatDate(rawDate, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Verified Date';

                  return (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-xl font-bold text-emerald-600 dark:text-emerald-400 animate-float">
                          🏅
                        </span>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                            {gigTitle}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-400">
                            <span>📅 {dateStr}</span>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100/50 dark:border-slate-700 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                              Verified Accomplishment
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-600/50">
                          ⏱️ {p.hours ?? 0} hours contributed
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

