import { zodResolver } from '@hookform/resolvers/zod';
const confetti = () => import('canvas-confetti').then((m) => m.default);
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Certificate } from '../components/Certificate';
import { PhotoUpload } from '../components/PhotoUpload';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { completeParticipationViaApi, joinGigViaApi } from '../services/gigs';
import type { Participation } from '../types/database';
import { formatDate } from '../utils/format';
import { logger } from '../utils/logger';

const schema = z.object({
  hours: z.coerce.number().min(0.5, 'Minimum 0.5 hours').max(24, 'Maximum 24 hours'),
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
      .select('*, gigs(title, profiles:ngo_id(name))')
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

  const canSubmit = !submitting;

  const onSubmit = async (data: FormData) => {
    if (!user || !participation) return;

    setSubmitting(true);
    setPageError(null);
    try {
      const payload: Record<string, unknown> = { hours: data.hours };
      if (beforeUrl) payload.before_photo_url = beforeUrl;
      if (afterUrl) payload.after_photo_url = afterUrl;
      const result = await completeParticipationViaApi(
        participation.id,
        payload as Parameters<typeof completeParticipationViaApi>[1],
      );

      const updated = (result as { participation?: Participation }).participation;
      if (updated) {
        setParticipation(updated as Participation);
      } else {
        setParticipation({
          ...participation,
          status: 'completed',
          hours: data.hours,
          ...(beforeUrl ? { before_photo_url: beforeUrl } : {}),
          ...(afterUrl ? { after_photo_url: afterUrl } : {}),
        } as Participation);
      }

      setCompleted(true);
      toast.success(`You earned ${result.karma_earned ?? '?'} karma points!`);
      await refreshProfile();

      try {
        void confetti().then((f) => f({
          particleCount: 150,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#34d399', '#6366f1', '#a855f7'],
        }))
      } catch (e) {
        logger.error('Failed to launch confetti:', e);
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
  const gigOrgName = (
    participation as Participation & { gigs?: { profiles?: { name: string } } }
  )?.gigs?.profiles?.name;

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
        <p className="mt-4 text-gray-600 dark:text-slate-300">
          You need to join this gig before uploading photos.
        </p>
        {pageError && <p className="mt-2 text-sm text-red-600">{pageError}</p>}
        <div className="mt-4 flex gap-3">
          <Button onClick={handleJoin} disabled={submitting}>
            Join gig
          </Button>
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
          orgName={gigOrgName}
          completedDate={formatDate(new Date(), {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        />
        {(participation.before_photo_url ||
          participation.after_photo_url ||
          beforeUrl ||
          afterUrl) && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(participation.before_photo_url || beforeUrl) && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">Before</p>
                <img
                  src={participation.before_photo_url || beforeUrl!}
                  alt="Before"
                  className="w-full h-auto rounded-lg object-contain"
                  onError={() =>
                    logger.error(
                      'Before photo failed to load:',
                      participation.before_photo_url || beforeUrl,
                    )
                  }
                />
              </div>
            )}
            {(participation.after_photo_url || afterUrl) && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">After</p>
                <img
                  src={participation.after_photo_url || afterUrl!}
                  alt="After"
                  className="w-full h-auto rounded-lg object-contain"
                  onError={() =>
                    logger.error(
                      'After photo failed to load:',
                      participation.after_photo_url || afterUrl,
                    )
                  }
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
        Upload photos (optional) while you fill in the details — they'll start uploading right away.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <PhotoUpload label="Before photo" onUploadComplete={setBeforeUrl} />
            {beforeUrl && (
              <img
                src={beforeUrl}
                alt="Before"
                className="w-full h-auto rounded-lg object-contain"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <PhotoUpload label="After photo" onUploadComplete={setAfterUrl} />
            {afterUrl && (
              <img src={afterUrl} alt="After" className="w-full h-auto rounded-lg object-contain" />
            )}
          </div>
        </div>

        <div>
          <label htmlFor="participate-hours" className="text-sm font-medium">
            Hours volunteered
          </label>
          <Input
            {...register('hours')}
            id="participate-hours"
            type="number"
            inputMode="decimal"
            min={0.5}
            max={24}
            step={0.5}
            className="mt-1"
            onWheel={(e) => e.currentTarget.blur()}
          />
          {errors.hours && <FieldError message={errors.hours.message} />}
        </div>

        {(errors.root || pageError) && (
          <div
            className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
            role="alert"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {errors.root?.message ?? pageError}
          </div>
        )}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {submitting ? 'Submitting…' : 'Complete gig'}
        </Button>
      </form>
    </div>
  );
}
