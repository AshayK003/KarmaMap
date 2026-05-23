import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generatePortfolioSlug } from '../utils/geo';
import type { Participation } from '../types/database';

export function VolunteerPortfolio() {
  const { profile, user, refreshProfile } = useAuth();
  const [completed, setCompleted] = useState<Participation[]>([]);
  const [shareUrl, setShareUrl] = useState('');

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
  }, [user, profile]);

  const enableSharing = async () => {
    if (!user || !profile) return;
    const slug = profile.portfolio_slug ?? generatePortfolioSlug(profile.name);
    await supabase.from('profiles').update({ portfolio_slug: slug }).eq('id', user.id);
    setShareUrl(`${window.location.origin}/p/${slug}`);
    await refreshProfile();
  };

  const totalHours = completed.reduce((s, p) => s + Number(p.hours ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">{profile?.name}&apos;s Portfolio</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-emerald-700">{profile?.karma_points ?? 0}</p>
          <p className="text-sm text-gray-500">Karma points</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-amber-600">{profile?.streak ?? 0}</p>
          <p className="text-sm text-gray-500">Day streak</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-gray-800">{totalHours}</p>
          <p className="text-sm text-gray-500">Hours contributed</p>
        </div>
      </div>

      <div className="mt-6">
        {!shareUrl ? (
          <button
            type="button"
            onClick={enableSharing}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            Generate public portfolio link
          </button>
        ) : (
          <p className="text-sm">
            Share:{' '}
            <a href={shareUrl} className="text-emerald-600 underline">
              {shareUrl}
            </a>
          </p>
        )}
      </div>

      <h2 className="mt-8 font-semibold">Completed gigs</h2>
      <ul className="mt-3 space-y-2">
        {completed.length === 0 && (
          <p className="text-sm text-gray-500">No completed gigs yet.</p>
        )}
        {completed.map((p) => (
          <li key={p.id} className="rounded-lg border bg-white p-3 text-sm">
            {(p as Participation & { gigs?: { title: string } }).gigs?.title} ·{' '}
            {p.hours}h
          </li>
        ))}
      </ul>

      {profile?.skills && profile.skills.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <span key={s} className="rounded-full bg-emerald-100 px-3 py-1 text-xs">
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
