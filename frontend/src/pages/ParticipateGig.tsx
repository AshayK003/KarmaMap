import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PhotoUpload } from '../components/PhotoUpload';
import { Certificate } from '../components/Certificate';
import { uploadParticipationPhoto } from '../services/storage';
import { completeParticipationViaApi, joinGigViaApi } from '../services/gigs';
import type { Participation } from '../types/database';

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
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingParticipation, setLoadingParticipation] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

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
      await loadParticipation();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not join gig');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      setError('root', { message: 'You must be logged in' });
      return;
    }
    if (!participation) {
      setError('root', { message: 'Join this gig before completing it' });
      return;
    }

    setSubmitting(true);
    setPageError(null);
    try {
      let beforeUrl = participation.before_photo_url;
      let afterUrl = participation.after_photo_url;

      if (beforeFile) {
        beforeUrl = await uploadParticipationPhoto(user.id, beforeFile, 'before');
      }
      if (afterFile) {
        afterUrl = await uploadParticipationPhoto(user.id, afterFile, 'after');
      }

      if (!beforeUrl || !afterUrl) {
        setError('root', {
          message: 'Please upload both before and after photos',
        });
        return;
      }

      const result = await completeParticipationViaApi(participation.id, {
        hours: data.hours,
        before_photo_url: beforeUrl,
        after_photo_url: afterUrl,
      });

      const updated = (result as { participation?: Participation }).participation;
      if (updated) {
        setParticipation(updated as Participation);
      } else {
        setParticipation({
          ...participation,
          status: 'completed',
          hours: data.hours,
          before_photo_url: beforeUrl,
          after_photo_url: afterUrl,
        });
      }

      setCompleted(true);
      await refreshProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete';
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
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!participation && !completed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-bold">Complete: {gigTitle}</h1>
        <p className="mt-4 text-gray-600">You need to join this gig before uploading photos.</p>
        {pageError && <p className="mt-2 text-sm text-red-600">{pageError}</p>}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleJoin}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Join gig
          </button>
          <Link to={`/gigs/${gigId}`} className="rounded-xl border px-4 py-2 text-gray-700">
            Back to gig
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
          completedDate={new Date().toLocaleDateString()}
        />
        {(participation.before_photo_url || participation.after_photo_url) && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            {participation.before_photo_url && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Before</p>
                <img
                  src={participation.before_photo_url}
                  alt="Before"
                  className="rounded-lg"
                />
              </div>
            )}
            {participation.after_photo_url && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">After</p>
                <img
                  src={participation.after_photo_url}
                  alt="After"
                  className="rounded-lg"
                />
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate('/portfolio')}
          className="mt-6 w-full rounded-xl border border-emerald-600 py-2 text-emerald-700"
        >
          View portfolio
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold">Complete: {gigTitle}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Upload before/after photos to verify your impact.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <PhotoUpload label="Before photo" onFileSelect={setBeforeFile} />
          <PhotoUpload label="After photo" onFileSelect={setAfterFile} />
        </div>

        <div>
          <label className="text-sm font-medium">Hours volunteered</label>
          <input
            {...register('hours')}
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            onWheel={(e) => e.currentTarget.blur()}
          />
          {errors.hours && (
            <p className="mt-1 text-xs text-red-600">{errors.hours.message}</p>
          )}
        </div>

        {(errors.root || pageError) && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {errors.root?.message ?? pageError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-emerald-600 py-3 text-white disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Complete gig & earn karma'}
        </button>
      </form>
    </div>
  );
}
