import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generatePortfolioSlug } from '../utils/geo';
import type { Participation } from '../types/database';
import { Certificate } from '../components/Certificate';

export function VolunteerPortfolio() {
  const { profile, user, refreshProfile } = useAuth();
  const [completed, setCompleted] = useState<Participation[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState<{
    participation: Participation;
    title: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('participations')
      .select('*, gigs(title, gig_date)')
      .eq('volunteer_id', user.id)
      .eq('status', 'completed')
      .then(({ data }) => setCompleted((data as Participation[]) ?? []));

    if (profile?.portfolio_slug) {
      setShareUrl(`${window.location.origin}/p/${profile.portfolio_slug}`);
    }
    if (profile?.bio) {
      setBioInput(profile.bio);
    }
  }, [user, profile]);

  const enableSharing = async () => {
    if (!user || !profile) return;
    const slug = profile.portfolio_slug ?? generatePortfolioSlug(profile.name);
    await supabase.from('profiles').update({ portfolio_slug: slug }).eq('id', user.id);
    setShareUrl(`${window.location.origin}/p/${slug}`);
    await refreshProfile();
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;
    setSaveLoading(true);
    try {
      await supabase.from('profiles').update({ bio: bioInput }).eq('id', user.id);
      await refreshProfile();
      setIsEditingBio(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const totalHours = completed.reduce((s, p) => s + Number(p.hours ?? 0), 0);

  // Dynamic Karma Level calculation
  const getKarmaLevel = (points: number) => {
    if (points >= 1000) return { title: 'Legendary Leader 🌟', color: 'from-purple-600 to-indigo-600', max: 5000 };
    if (points >= 500) return { title: 'Community Champion 🟣', color: 'from-violet-500 to-fuchsia-500', max: 1000 };
    if (points >= 100) return { title: 'Impact Hero 🔵', color: 'from-blue-500 to-cyan-500', max: 500 };
    return { title: 'Karma Novice 🟢', color: 'from-emerald-500 to-teal-500', max: 100 };
  };

  const karma = profile?.karma_points ?? 0;
  const level = getKarmaLevel(karma);
  const nextMilestonePercent = Math.min(100, (karma / level.max) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page Header ── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-emerald-100/60 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-2">
            Volunteer Portfolio <span className="text-2xl animate-float">✨</span>
          </h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Showcase your completed gigs, impact statistics, and verified accomplishments.
          </p>
        </div>

        {/* Public Share Panel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white/80 border border-slate-100 rounded-2xl p-2 shadow-xs backdrop-blur-sm">
          {!shareUrl ? (
            <button
              type="button"
              onClick={enableSharing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer"
            >
              🌐 Generate Public Page
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 select-all overflow-hidden max-w-[240px] truncate">
                <span>🔗</span> {shareUrl}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all duration-200 cursor-pointer active:scale-95 ${
                    copied
                      ? 'bg-teal-600 shadow-teal-500/10'
                      : 'bg-slate-800 hover:bg-slate-900 shadow-slate-900/10'
                  }`}
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 transition-all duration-200 shadow-2xs cursor-pointer active:scale-95"
                >
                  👁️ View
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* ─── Left Sidebar: Profile Details ─── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Main profile glass card */}
          <div className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md p-6 shadow-md">
            <div className="flex flex-col items-center text-center">
              {/* Profile Avatar Glow ring */}
              <div className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr ${level.color} p-1 shadow-lg`}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-3xl font-black text-slate-700">
                  {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'VM'}
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-sm shadow-md border-2 border-white select-none">
                  🛡️
                </span>
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-800">{profile?.name}</h2>
              <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${level.color} px-3.5 py-1 text-xs font-extrabold text-white shadow-xs`}>
                {level.title}
              </span>
            </div>

            {/* Inline Bio Section */}
            <div className="mt-6 border-t border-slate-100/80 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Personal Bio</span>
                {!isEditingBio ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(true)}
                    className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                ) : null}
              </div>

              {!isEditingBio ? (
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 italic">
                  {profile?.bio || 'Add a helpful bio to showcase your story, motivations and volunteer aspirations…'}
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  <textarea
                    rows={4}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={200}
                    placeholder="Tell us why you love volunteering..."
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>{bioInput.length}/200 chars</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingBio(false)}
                        className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-slate-600 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBio}
                        disabled={saveLoading}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {saveLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Skills Badges */}
            <div className="mt-6 border-t border-slate-100/80 pt-5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-3">
                Expertise & Skills
              </span>
              {profile?.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-all duration-200"
                    >
                      🌱 {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-semibold text-slate-400 italic">No skills registered yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Pane: Stats and Gigs Timeline ─── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Karma Card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-800">Karma</span>
                <span className="text-xl">✨</span>
              </div>
              <p className="mt-2 text-3xl font-black text-emerald-700">{profile?.karma_points ?? 0}</p>
              {/* Level Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-1">
                  <span>Progress to next Rank</span>
                  <span>{karma}/{level.max} XP</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${level.color} transition-all duration-500`}
                    style={{ width: `${nextMilestonePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Streak Card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-amber-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-amber-800">Day Streak</span>
                <span className="text-xl animate-float">🔥</span>
              </div>
              <p className="mt-2 text-3xl font-black text-amber-600">{profile?.streak ?? 0}</p>
              <p className="mt-4 text-[10px] font-bold text-slate-400 leading-normal">
                {profile?.streak && profile.streak > 0
                  ? 'Awesome momentum! Keep making an impact to extend your streak.'
                  : 'Complete nearby gigs to launch your daily streak!'}
              </p>
            </div>

            {/* Hours Card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-blue-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-800">Dedicated Hours</span>
                <span className="text-xl">⏳</span>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-800">{totalHours}h</p>
              <p className="mt-4 text-[10px] font-bold text-slate-400 leading-normal">
                {totalHours > 0
                  ? `Incredible contribution! You spent ${totalHours} hours serving local NGOs.`
                  : 'Your volunteer logs and time contributions will display here.'}
              </p>
            </div>
          </div>

          {/* Completed Gigs List / Timeline */}
          <div className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md p-6 shadow-md">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
              <span>📋</span> Completed Gigs & Achievements
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Verified volunteer history with downloadable impact certificates.
            </p>

            <div className="mt-6 space-y-4">
              {completed.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center">
                  <span className="text-3xl select-none">🌱</span>
                  <p className="mt-2 text-sm font-extrabold text-slate-600">No completed gigs logged yet</p>
                  <p className="text-xs font-medium text-slate-400 mt-1 max-w-xs mx-auto">
                    Once you participate in open opportunities and the NGO marks it complete, your certificates will compile here!
                  </p>
                </div>
              ) : (
                completed.map((p) => {
                  const gigTitle = (p as Participation & { gigs?: { title: string } }).gigs?.title ?? 'Volunteer Gig';
                  const rawDate = (p as Participation & { gigs?: { gig_date: string } }).gigs?.gig_date;
                  const dateStr = rawDate
                    ? new Date(rawDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Verified Date';

                  return (
                    <div
                      key={p.id}
                      className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-100 bg-white hover:bg-emerald-50/20 p-4 transition-all duration-200 hover:shadow-xs hover:border-emerald-100/50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-600">
                          🏅
                        </span>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-emerald-800 transition-colors">
                            {gigTitle}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-400">
                            <span>📅 {dateStr}</span>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-50 pt-2 sm:pt-0">
                        <span className="text-xs font-extrabold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/50">
                          ⏱️ {p.hours ?? 0} hours
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCert({
                              participation: p,
                              title: gigTitle,
                              date: rawDate || new Date().toISOString(),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          📜 View Certificate
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Printable Certificate Modal ─── */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="mt-3">
              <Certificate
                volunteerName={profile?.name || ''}
                participation={selectedCert.participation}
                gigTitle={selectedCert.title}
                completedDate={new Date(selectedCert.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-slate-800/10 transition-all cursor-pointer active:scale-95"
              >
                🖨️ Print Certificate
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-black text-slate-700 transition-all cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

