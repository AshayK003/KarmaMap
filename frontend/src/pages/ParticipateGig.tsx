import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PhotoUpload } from '../components/PhotoUpload';
import { Certificate } from '../components/Certificate';
import { completeParticipationViaApi, joinGigViaApi } from '../services/gigs';
import { toast } from 'sonner';
import type { Participation } from '../types/database';
import { Button } from '@/components/ui/button';

const schema = z.object({
  hours: z.coerce
    .number()
    .min(0.5, 'Minimum 0.5 hours')
    .max(24, 'Maximum 24 hours'),
});

type FormData = z.infer<typeof schema>;

export function ParticipateGig() {
  const { id: gigId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingParticipation, setLoadingParticipation] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { hours: 2 },
  });

  const loadParticipation = async () => {
    if (!gigId || !user) return;
    setLoadingParticipation(true);
    setPageError(null);
    const { data, error } = await supabase
      .from('participations')
      .select('*, gigs(title)')
      .eq('gig_id', gigId)
      .eq('volunteer_id', user.id)
      .maybeSingle();

    if (error) {
      setPageError(error.message);
      setParticipation(null);
    } else if (data) {
      setParticipation(data as Participation);
      if (data.status === 'completed') setCompleted(true);
      if (data.before_photo_url) setBeforeUrl(data.before_photo_url);
      if (data.after_photo_url) setAfterUrl(data.after_photo_url);
    } else {
      setParticipation(null);
    }
    setLoadingParticipation(false);
  };

  useEffect(() => {
    loadParticipation();
  }, [gigId, user]);

  const handleJoin = async () => {
    if (!gigId) return;
    setSubmitting(true);
    try {
      await joinGigViaApi(gigId);
      toast.success('Joined gig! Now upload photos when ready.');
      await loadParticipation();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not join gig';
      toast.error(message);
      setPageError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && beforeUrl && afterUrl;

  const onSubmit = async (data: FormData) => {
    if (!user || !participation) return;

    setSubmitting(true);
    setPageError(null);
    try {
      const result = await completeParticipationViaApi(participation.id, {
        hours: data.hours,
        before_photo_url: beforeUrl!,
        after_photo_url: afterUrl!,
      });

      const updated = (result as { participation?: Participation }).participation;
      if (updated) {
        setParticipation(updated as Participation);
      } else {
        setParticipation({
          ...participation,
          status: 'completed',
          hours: data.hours,
          before_photo_url: beforeUrl!,
          after_photo_url: afterUrl!,
        });
      }

      setCompleted(true);
      toast.success(`You earned ${result.karma_earned ?? '?'} karma points!`);
      await refreshProfile();

      try {
        const module = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm');
        const confetti = module.default || module;
        confetti({
          particleCount: 150,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#34d399', '#6366f1', '#a855f7'],
        });
      } catch (e) {
        console.error('Failed to launch confetti:', e);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete';
      toast.error(message);
      setError('root', { message });
    } finally {
      setSubmitting(false);
    }
  };

  const gigTitle =
    (participation as Participation & { gigs?: { title: string } })?.gigs?.title ??
    'Volunteer Gig';

  if (loadingParticipation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-bold text-slate-400">Loading participation…</p>
        </div>
      </div>
    );
  }

  if (!participation && !completed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-bold">Complete: {gigTitle}</h1>
        <p className="mt-4 text-gray-600 dark:text-slate-300">You need to join this gig before uploading photos.</p>
        {pageError && <p className="mt-2 text-sm text-red-600">{pageError}</p>}
        <div className="mt-4 flex gap-3">
          <Button onClick={handleJoin} disabled={submitting}>Join gig</Button>
          <Link to={`/gigs/${gigId}`}>
            <Button variant="outline">Back to gig</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (completed && participation && profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Certificate
          volunteerName={profile.name}
          participation={participation}
          gigTitle={gigTitle}
          completedDate={format(new Date(), 'MMM d, yyyy')}
        />
        {(participation.before_photo_url || participation.after_photo_url) && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {participation.before_photo_url && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Before</p>
                <img
                  src={participation.before_photo_url}
                  alt="Before"
                  className="w-full rounded-lg object-cover max-h-48"
                />
              </div>
            )}
            {participation.after_photo_url && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">After</p>
                <img
                  src={participation.after_photo_url}
                  alt="After"
                  className="w-full rounded-lg object-cover max-h-48"
                />
              </div>
            )}
          </div>
        )}
        <Button variant="outline" className="mt-6 w-full" onClick={() => navigate('/portfolio')}>
          View portfolio
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold">Complete: {gigTitle}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
        Upload photos while you fill in the details — they'll start uploading right away.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhotoUpload label="Before photo" onUploadComplete={setBeforeUrl} />
          <PhotoUpload label="After photo" onUploadComplete={setAfterUrl} />
        </div>

        <div>
          <label htmlFor="participate-hours" className="text-sm font-medium">Hours volunteered</label>
          <input
            {...register('hours')}
            id="participate-hours"
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2"
            onWheel={(e) => e.currentTarget.blur()}
          />
          {errors.hours && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.hours.message}</p>
          )}
        </div>

        {(errors.root || pageError) && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2" role="alert">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errors.root?.message ?? pageError}
          </div>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full"
        >
          {submitting
            ? 'Submitting…'
            : !beforeUrl || !afterUrl
              ? 'Wait for photo uploads…'
              : 'Complete gig & earn karma'}
        </Button>
      </form>
    </div>
  );
}
