import confetti from 'canvas-confetti';
import {
  Award,
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  Edit,
  Eye,
  Flame,
  Globe,
  Hourglass,
  Leaf,
  Link,
  Printer,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Certificate } from '../components/Certificate';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Participation } from '../types/database';
import { apiFetch } from '../utils/api';
import { formatDate } from '../utils/format';
import { calculateHaversineDistance, generatePortfolioSlug, parseGigLocation } from '../utils/geo';
import { getKarmaLevel } from '../utils/karma';

export function VolunteerPortfolio() {
  const { profile, user, refreshProfile } = useAuth();
  const [completed, setCompleted] = useState<Participation[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [workingSkills, setWorkingSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [selectedCert, setSelectedCert] = useState<{
    participation: Participation;
    title: string;
    date: string;
  } | null>(null);
  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    role: string;
    opted_in: boolean;
  } | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    Promise.resolve(
      supabase
        .from('participations')
        .select('*, gigs(title, gig_date, location)')
        .eq('volunteer_id', user.id)
        .eq('status', 'completed')
        .then(({ data }) => setCompleted((data as Participation[]) ?? [])),
    ).catch((err: unknown) => console.error('Failed to fetch completed gigs:', err));

    if (profile?.portfolio_slug) {
      setShareUrl(`${window.location.origin}/p/${profile.portfolio_slug}`);
    }
    if (profile?.bio) {
      setBioInput(profile.bio);
    }

    apiFetch<{ org: { role: string; opted_in: boolean; organizations: { name: string } } | null }>(
      '/api/organizations/my-org',
    )
      .then((res) => {
        if (res.org) {
          setOrgInfo({
            name: res.org.organizations.name,
            role: res.org.role,
            opted_in: res.org.opted_in,
          });
        }
      })
      .catch(() => {});
  }, [user, profile]);

  const enableSharing = async () => {
    if (!user || !profile) return;
    try {
      const slug = profile.portfolio_slug ?? generatePortfolioSlug(profile.name);
      await supabase.from('profiles').update({ portfolio_slug: slug }).eq('id', user.id);
      setShareUrl(`${window.location.origin}/p/${slug}`);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to enable sharing:', err);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.share({
        title: `${profile?.name}'s Volunteer Impact Portfolio`,
        text: `Check out my verified volunteer accomplishments, daily streaks, and logged impact hours on KarmaMap!`,
        url: shareUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Sharing failed', err);
    }
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

  const handleEditSkills = () => {
    setWorkingSkills([...(profile?.skills ?? [])]);
    setNewSkill('');
    setIsEditingSkills(true);
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !workingSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setWorkingSkills([...workingSkills, trimmed]);
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (index: number) => {
    setWorkingSkills(workingSkills.filter((_, i) => i !== index));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleSaveSkills = async () => {
    if (!user) return;
    setSaveLoading(true);
    try {
      await supabase.from('profiles').update({ skills: workingSkills }).eq('id', user.id);
      await refreshProfile();
      setIsEditingSkills(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
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

  const handleOptInToggle = async () => {
    if (!orgInfo) return;
    setOrgLoading(true);
    try {
      const newVal = !orgInfo.opted_in;
      await apiFetch('/api/organizations/my-org/opt-in', {
        method: 'PATCH',
        body: JSON.stringify({ opted_in: newVal }),
      });
      setOrgInfo({ ...orgInfo, opted_in: newVal });
    } catch (err) {
      console.error('Failed to update sharing preference:', err);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleViewCert = async (p: Participation, title: string, date: string) => {
    setSelectedCert({
      participation: p,
      title,
      date: date || new Date().toISOString(),
    });

    try {
      // Cannon from left
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.8 },
        colors: ['#10b981', '#059669', '#34d399', '#6366f1', '#a855f7'],
      });
      // Cannon from right
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.8 },
        colors: ['#10b981', '#059669', '#34d399', '#6366f1', '#a855f7'],
      });
    } catch (e) {
      console.error('Failed to launch confetti:', e);
    }
  };

  const totalHours = useMemo(
    () => completed.reduce((s, p) => s + Number(p.hours ?? 0), 0),
    [completed],
  );

  const { co2SavedKg, treesPlanted } = useMemo(() => {
    const volParsed = profile?.location ? parseGigLocation(profile.location) : null;

    let totalCo2SavedMeters = 0;
    for (const p of completed) {
      const gigLoc = (p as unknown as Record<string, unknown> & { gigs?: { location?: unknown } })
        ?.gigs?.location;
      if (volParsed && gigLoc) {
        const gigParsed = parseGigLocation(gigLoc);
        if (gigParsed) {
          const distance = calculateHaversineDistance(
            volParsed.lat,
            volParsed.lng,
            gigParsed.lat,
            gigParsed.lng,
          );
          totalCo2SavedMeters += distance * 2;
        }
      }
    }
    const c = (totalCo2SavedMeters / 1000) * 0.12;
    return { co2SavedKg: c, treesPlanted: c / 22 };
  }, [completed, profile?.location]);

  const karma = profile?.karma_points ?? 0;
  const level = useMemo(() => getKarmaLevel(karma), [karma]);
  const nextMilestonePercent = useMemo(
    () => Math.min(100, (karma / level.max) * 100),
    [karma, level.max],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page Header ── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-emerald-100/60 dark:border-slate-700 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Volunteer Portfolio <Sparkles className="h-6 w-6 text-emerald-500 animate-float" />
          </h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Showcase your completed gigs, impact statistics, and verified accomplishments.
          </p>
        </div>

        {/* Public Share Panel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-2xl p-2 shadow-xs dark:shadow-none dark:shadow-slate-900/50 backdrop-blur-sm">
          {!shareUrl ? (
            <Button onClick={enableSharing}>
              <Globe className="h-4 w-4 mr-1 inline" /> Generate Public Page
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 select-all overflow-hidden max-w-[240px] truncate">
                <Link className="h-3.5 w-3.5 inline" /> {shareUrl}
              </div>
              <div className="flex gap-1.5">
                <Button variant={copied ? 'default' : 'secondary'} onClick={handleCopyLink}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                {typeof navigator.share === 'function' && (
                  <Button onClick={handleNativeShare}>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M8.684 10.742l4.632-2.316m0 4.632l-4.632-2.316m0 0a3 3 0 11-6 0 3 3 0 016 0zm11.368-4.632a3 3 0 11-6 0 3 3 0 016 0zm0 9.264a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Share
                  </Button>
                )}
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-1 inline" /> View
                  </Button>
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
          <Card>
            <div className="flex flex-col items-center text-center">
              {/* Profile Avatar Glow ring */}
              <div
                className={`relative rounded-full bg-gradient-to-tr ${level.color} p-1 shadow-lg`}
              >
                <Avatar
                  size="xl"
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.name || 'VM')}&backgroundType=gradientLinear&fontSize=42`}
                  alt={profile?.name ?? 'VM'}
                />
                <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 dark:bg-slate-900 text-sm shadow-md dark:shadow-none dark:shadow-slate-900/50 border-2 border-white dark:border-slate-700 select-none">
                  <Shield className="h-4 w-4" />
                </span>
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-800 dark:text-slate-100">
                {profile?.name}
              </h2>
              <span
                className={`mt-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${level.color} px-3.5 py-1 text-xs font-extrabold text-white shadow-xs`}
              >
                {level.title}
              </span>
            </div>

            {/* Inline Bio Section */}
            <div className="mt-6 border-t border-slate-100/80 dark:border-slate-700 pt-5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bio-textarea"
                  className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400"
                >
                  Personal Bio
                </label>
                {!isEditingBio ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(true)}
                    className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5 inline" /> Edit
                  </button>
                ) : null}
              </div>

              {!isEditingBio ? (
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 italic">
                  {profile?.bio ||
                    'Add a helpful bio to showcase your story, motivations and volunteer aspirations…'}
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  <textarea
                    id="bio-textarea"
                    rows={4}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={200}
                    placeholder="Tell us why you love volunteering..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>{bioInput.length}/200 chars</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingBio(false)}
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBio}
                        disabled={saveLoading}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-white shadow-xs dark:shadow-none dark:shadow-slate-900/50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {saveLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Skills Badges */}
            <div className="mt-6 border-t border-slate-100/80 dark:border-slate-700 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Expertise & Skills
                </span>
                {!isEditingSkills && (
                  <button
                    type="button"
                    onClick={handleEditSkills}
                    className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5 inline" /> Edit
                  </button>
                )}
              </div>

              {!isEditingSkills ? (
                profile?.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="gap-1 px-3 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                      >
                        <Leaf className="h-3 w-3 inline" /> {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic">
                    No skills registered yet.
                  </p>
                )
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {workingSkills.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 group"
                      >
                        <Leaf className="h-3 w-3 inline" /> {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(i)}
                          className="ml-0.5 rounded-full p-0.5 text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors cursor-pointer"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      placeholder="Type a skill and press Enter"
                      aria-label="Add a new skill"
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={!newSkill.trim()}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-xs dark:shadow-none dark:shadow-slate-900/50 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingSkills(false)}
                      className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSkills}
                      disabled={saveLoading}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs dark:shadow-none dark:shadow-slate-900/50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {saveLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ─── Right Pane: Stats and Gigs Timeline ─── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Karma Card */}
            <Card className="relative overflow-hidden p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                  Karma
                </span>
                <Sparkles className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">
                {profile?.karma_points ?? 0}
              </p>
              {/* Level Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-1">
                  <span>Progress to next Rank</span>
                  <span>
                    {karma}/{level.max} XP
                  </span>
                </div>
                <Progress
                  value={nextMilestonePercent}
                  indicatorClassName={`bg-gradient-to-r ${level.color}`}
                />
              </div>
            </Card>

            {/* Streak Card */}
            <Card className="relative overflow-hidden p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-amber-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">
                  Day Streak
                </span>
                <Flame className="h-5 w-5 text-amber-500 animate-float" />
              </div>
              <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">
                {profile?.streak ?? 0}
              </p>
              <p className="mt-4 text-[10px] font-bold text-slate-400 leading-normal">
                {profile?.streak && profile.streak > 0
                  ? 'Awesome momentum! Keep making an impact to extend your streak.'
                  : 'Complete nearby gigs to launch your daily streak!'}
              </p>
            </Card>

            {/* Hours Card */}
            <Card className="relative overflow-hidden p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-blue-500/10 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                  Dedicated Hours
                </span>
                <Hourglass className="h-5 w-5 text-blue-500" />
              </div>
              <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">
                {totalHours}h
              </p>
              <p className="mt-4 text-[10px] font-bold text-slate-400 leading-normal">
                {totalHours > 0
                  ? `Incredible contribution! You spent ${totalHours} hours serving local NGOs.`
                  : 'Your volunteer logs and time contributions will display here.'}
              </p>
              {completed.length > 0 && (
                <p className="mt-1.5 text-[10px] font-bold text-slate-400 leading-normal">
                  Avg {(totalHours / completed.length).toFixed(1)}h per gig
                </p>
              )}
            </Card>

            {/* Eco-Hero Card */}
            <Card className="relative overflow-hidden bg-emerald-50/25 dark:bg-emerald-900/20 p-5 shadow-xs">
              <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-emerald-500/25 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                  Eco-Savings
                </span>
                <Leaf className="h-5 w-5 text-emerald-500 animate-bounce" />
              </div>
              <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">
                {co2SavedKg >= 1
                  ? `${co2SavedKg.toFixed(2)} kg`
                  : `${Math.round(co2SavedKg * 1000)} g`}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1">
                  <span>Carbon Offset</span>
                  <span>{treesPlanted.toFixed(2)} Trees Eq.</span>
                </div>
                <Progress
                  value={Math.min(100, treesPlanted * 100)}
                  indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
                />
              </div>

              {orgInfo && (
                <div className="mt-6 border-t border-slate-100/80 dark:border-slate-700 pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Your Organization
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {orgInfo.name}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5 capitalize">
                    Role: {orgInfo.role}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <label
                      htmlFor="opt-in-toggle"
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                    >
                      Share volunteer data with {orgInfo.name}
                    </label>
                    <button
                      id="opt-in-toggle"
                      type="button"
                      role="switch"
                      aria-checked={orgInfo.opted_in}
                      aria-label="Toggle data sharing"
                      disabled={orgLoading}
                      onClick={handleOptInToggle}
                      className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer disabled:opacity-50 ${
                        orgInfo.opted_in ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                          orgInfo.opted_in ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] font-medium text-slate-400 leading-relaxed">
                    {orgInfo.opted_in
                      ? "Your completed gigs and hours are visible to your organization's dashboard."
                      : 'Toggle on to allow your organization to see aggregate volunteer data.'}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Completed Gigs List / Timeline */}
          <Card>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <ClipboardList className="h-5 w-5" /> Completed Gigs & Achievements
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Verified volunteer history with downloadable impact certificates.
            </p>

            <div className="mt-6 space-y-4">
              {completed.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 p-8 text-center">
                  <Leaf className="h-8 w-8 text-emerald-300" />
                  <p className="mt-2 text-sm font-extrabold text-slate-600 dark:text-slate-300">
                    No completed gigs logged yet
                  </p>
                  <p className="text-xs font-medium text-slate-400 mt-1 max-w-xs mx-auto">
                    Once you participate in open opportunities and the NGO marks it complete, your
                    certificates will compile here!
                  </p>
                </div>
              ) : (
                completed.map((p) => {
                  const gigTitle =
                    (p as Participation & { gigs?: { title: string } }).gigs?.title ??
                    'Volunteer Gig';
                  const rawDate = (p as Participation & { gigs?: { gig_date: string } }).gigs
                    ?.gig_date;
                  const dateStr = rawDate
                    ? formatDate(rawDate, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Verified Date';

                  return (
                    <div
                      key={p.id}
                      className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 p-4 transition-all duration-200 hover:shadow-xs dark:hover:shadow-none dark:hover:shadow-slate-900/50 hover:border-emerald-100/50 dark:hover:border-slate-600"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          <Award className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                            {gigTitle}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {dateStr}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100/50 dark:border-slate-700 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-50 dark:border-slate-700 pt-2 sm:pt-0">
                        <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-600/50">
                          <Clock className="h-3.5 w-3.5 inline" /> {p.hours ?? 0} hours
                        </span>
                        <button
                          type="button"
                          onClick={() => handleViewCert(p, gigTitle, rawDate || '')}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs dark:shadow-none dark:shadow-slate-900/50 transition-all cursor-pointer active:scale-95"
                        >
                          <ClipboardList className="h-3.5 w-3.5 inline" /> View Certificate
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Printable Certificate Modal ─── */}
      {selectedCert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4 no-print animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Certificate of Impact"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl dark:shadow-none dark:shadow-slate-900/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setSelectedCert(null)}
              aria-label="Close certificate"
              className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="mt-3">
              <Certificate
                volunteerName={profile?.name || ''}
                participation={selectedCert.participation}
                gigTitle={selectedCert.title}
                completedDate={formatDate(selectedCert.date, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              />
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => {
                  window.print();
                  confetti({
                    particleCount: 80,
                    spread: 60,
                    origin: { y: 0.7 },
                    colors: ['#10b981', '#059669', '#34d399', '#6366f1', '#a855f7'],
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 dark:bg-slate-900 hover:bg-slate-900 dark:hover:bg-slate-950 px-5 py-2.5 text-xs font-black text-white shadow-md dark:shadow-none dark:shadow-slate-900/50 shadow-slate-800/10 transition-all cursor-pointer active:scale-95"
              >
                <Printer className="h-4 w-4 inline" /> Print Certificate
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 px-5 py-2.5 text-xs font-black text-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-95"
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
