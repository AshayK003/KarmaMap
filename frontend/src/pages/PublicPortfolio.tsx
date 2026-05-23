import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile, Participation } from '../types/database';

export function PublicPortfolio() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completed, setCompleted] = useState<Participation[]>([]);

  useEffect(() => {
    if (!slug) return;

    supabase
      .from('profiles')
      .select('*')
      .eq('portfolio_slug', slug)
      .single()
      .then(({ data }) => {
        setProfile(data);
        if (data) {
          supabase
            .from('participations')
            .select('*, gigs(title)')
            .eq('volunteer_id', data.id)
            .eq('status', 'completed')
            .then(({ data: parts }) => setCompleted((parts as Participation[]) ?? []));
        }
      });
  }, [slug]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Portfolio not found</p>
      </div>
    );
  }

  const totalHours = completed.reduce((s, p) => s + Number(p.hours ?? 0), 0);

  return (
    <div className="min-h-screen bg-emerald-50 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-lg text-center">
        <p className="text-sm text-emerald-600">KarmaMap Portfolio</p>
        <h1 className="mt-2 text-3xl font-bold">{profile.name}</h1>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold text-emerald-700">{profile.karma_points}</p>
            <p className="text-xs text-gray-500">Karma</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{profile.streak}</p>
            <p className="text-xs text-gray-500">Streak</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalHours}</p>
            <p className="text-xs text-gray-500">Hours</p>
          </div>
        </div>
        <ul className="mt-6 space-y-2 text-left text-sm">
          {completed.map((p) => (
            <li key={p.id} className="border-b py-2">
              {(p as Participation & { gigs?: { title: string } }).gigs?.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
