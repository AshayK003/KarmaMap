import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { LocationPicker } from '../components/LocationPicker';
import { useLocationPicker } from '../hooks/useLocationPicker';
import { createGigViaApi } from '../services/gigs';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  required_skills: z.string().min(1, 'Add at least one skill'),
  volunteers_needed: z.coerce
    .number({ invalid_type_error: 'Enter a valid number' })
    .int()
    .min(1, 'Need at least 1 volunteer')
    .max(500),
  gig_date: z.string().min(1, 'Pick a date'),
  gig_time: z.string().min(1, 'Pick a time'),
});

type FormData = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export function CreateGig() {
  const {
    lat,
    lng,
    source,
    geoError,
    setLocation,
    useGps,
    usePreset,
    setFromMap,
    setFromSearch,
    placeLabel,
  } = useLocationPicker();
  const navigate = useNavigate();
  const [showMap, setShowMap] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { volunteers_needed: 3, gig_time: '12:00' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const gigDate = new Date(`${data.gig_date}T${data.gig_time}`);
      if (Number.isNaN(gigDate.getTime())) {
        setError('gig_date', { message: 'Invalid date or time' });
        return;
      }

      await createGigViaApi({
        title: data.title,
        description: data.description,
        lat,
        lng,
        required_skills: data.required_skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        volunteers_needed: data.volunteers_needed,
        gig_date: gigDate.toISOString(),
      });
      navigate('/ngo/dashboard');
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Failed to create gig',
      });
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">Create volunteer gig</h1>

      <div className="mt-4">
        <LocationPicker
          lat={lat}
          lng={lng}
          source={source}
          placeLabel={placeLabel}
          geoError={geoError}
          onUseGps={useGps}
          onPreset={usePreset}
          onManualApply={(a, b) => setLocation(a, b, 'manual')}
          onSearchSelect={setFromSearch}
          mapHint="Gig will be created at the pin below — tap map to move it"
        />
      </div>

      {showMap && (
        <div className="mt-3">
          <MapView
            lat={lat}
            lng={lng}
            gigs={[]}
            height="220px"
            radiusMeters={500}
            pickMode
            onMapClick={setFromMap}
          />
          <button
            type="button"
            onClick={() => setShowMap(false)}
            className="mt-1 text-xs text-gray-500 hover:underline"
          >
            Hide map
          </button>
        </div>
      )}
      {!showMap && (
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="mt-2 text-sm text-emerald-600 hover:underline"
        >
          Show map picker
        </button>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="text-sm font-medium">Title</label>
          <input {...register('title')} className="mt-1 w-full rounded-lg border px-3 py-2" />
          <FieldError message={errors.title?.message} />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
          <FieldError message={errors.description?.message} />
        </div>
        <div>
          <label className="text-sm font-medium">Required skills</label>
          <input
            {...register('required_skills')}
            placeholder="teaching, cleanup"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
          <FieldError message={errors.required_skills?.message} />
        </div>
        <div>
          <label className="text-sm font-medium">Volunteers needed</label>
          <input
            {...register('volunteers_needed')}
            type="number"
            min={1}
            max={500}
            step={1}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            onWheel={(e) => e.currentTarget.blur()}
          />
          <FieldError message={errors.volunteers_needed?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Gig date</label>
            <input
              {...register('gig_date')}
              type="date"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              onChange={(e) => {
                register('gig_date').onChange(e);
                e.target.blur();
              }}
            />
            <FieldError message={errors.gig_date?.message} />
          </div>
          <div>
            <label className="text-sm font-medium">Gig time</label>
            <input
              {...register('gig_time')}
              type="time"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              onChange={(e) => {
                register('gig_time').onChange(e);
                e.target.blur();
              }}
            />
            <FieldError message={errors.gig_time?.message} />
          </div>
        </div>
        {errors.root && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {errors.root.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-emerald-600 py-3 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Creating & matching…' : 'Create gig'}
        </button>
      </form>
    </div>
  );
}
