import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { joinGigViaApi } from '../services/gigs';
import { useRealtimeParticipations } from '../hooks/useRealtimeGigs';
import type { Gig } from '../types/database';
import { skillOverlapScore } from '../utils/geo';

export function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [gig, setGig] = useState<Gig | null>(null);
  const [joining, setJoining] = useState(false);
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
    return <p className="p-8 text-center text-gray-500">Loading gig…</p>;
  }

  const overlap =
    profile?.role === 'volunteer'
      ? skillOverlapScore(gig.required_skills, profile.skills)
      : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{gig.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        by {(gig as Gig & { profiles?: { name: string } }).profiles?.name ?? 'NGO'}
      </p>
      <p className="mt-4 text-gray-700">{gig.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {gig.required_skills.map((s) => (
          <span key={s} className="rounded bg-emerald-100 px-2 py-1 text-xs">
            {s}
          </span>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">
          {volunteerCount || gig.volunteers_joined} / {gig.volunteers_needed} volunteers
          <span className="ml-2 text-emerald-600">(live)</span>
        </p>
        <p className="text-sm text-gray-500">
          Date: {new Date(gig.gig_date).toLocaleString()}
        </p>
        {profile?.role === 'volunteer' && (
          <p className="mt-1 text-sm font-medium text-emerald-600">
            {overlap}% skill match
          </p>
        )}
      </div>

      {profile?.role === 'volunteer' && user && (
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {joining ? 'Joining…' : 'Join this gig'}
        </button>
      )}
    </div>
  );
}
