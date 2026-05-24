import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { LocationPicker } from '../components/LocationPicker';
import { useLocationPicker } from '../hooks/useLocationPicker';
import { createGigViaApi } from '../services/gigs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  required_skills: z.string().min(1, 'Add at least one skill'),
  volunteers_needed: z.coerce
    .number()
    .int()
    .min(1, 'Need at least 1 volunteer')
    .max(500),
  gig_date: z.string().min(1, 'Pick a date'),
  gig_time: z.string().min(1, 'Pick a time'),
});

type FormData = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">{message}</p>;
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
    resolver: zodResolver(schema) as any,
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page Header ── */}
      <div className="mb-8 border-b border-emerald-100/60 dark:border-slate-700 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
          Create Volunteer Opportunity
        </h1>
        <p className="text-sm font-semibold text-slate-400 mt-1">
          Specify location coordinates and details to matching volunteers near you.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* ─── Left Column: Geospatial Location Settings ─── */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[76px]">
          <Card className="p-5 space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">Geospatial Center</h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                Volunteers within search range of this coordinate will see this opportunity.
              </p>
            </div>

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
              mapHint="Drag/Tap coordinates or use place search to position the gig pin."
            />

            {showMap ? (
              <div className="space-y-2">
                <MapView
                  lat={lat}
                  lng={lng}
                  gigs={[]}
                  height="260px"
                  radiusMeters={500}
                  pickMode
                  onMapClick={setFromMap}
                />
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowMap(false)}>Hide Map Picker</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <Button variant="outline" size="sm" onClick={() => setShowMap(true)}>Show Map Picker</Button>
              </div>
            )}
          </Card>
        </div>

        {/* ─── Right Column: Opportunity Context Form ─── */}
        <div className="lg:col-span-7">
          <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">Opportunity Details</h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                Describe the role and target skillsets required for the event.
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Gig Title
              </label>
              <input
                {...register('title')}
                type="text"
                placeholder="e.g. Community Garden Planting Day"
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <FieldError message={errors.title?.message} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Description & Impact Context
              </label>
              <textarea
                {...register('description')}
                rows={5}
                placeholder="Detail what volunteers will do, requirements, meeting spots and other essential guidelines..."
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <FieldError message={errors.description?.message} />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Required Skills
              </label>
              <input
                {...register('required_skills')}
                type="text"
                placeholder="e.g. cleanup, botany, teaching (comma separated)"
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <FieldError message={errors.required_skills?.message} />
              <p className="mt-1.5 text-[10px] font-bold text-slate-400 leading-normal">
                Volunteers with matching expertise chips will get score modifiers.
              </p>
            </div>

            {/* Dynamic Controls Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Volunteers Count */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Spots Available
                </label>
                <input
                  {...register('volunteers_needed')}
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <FieldError message={errors.volunteers_needed?.message} />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                  Gig Date
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <Input
                    {...register('gig_date')}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="pl-10"
                  />
                </div>
                <FieldError message={errors.gig_date?.message} />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                  Gig Time
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <Input
                    {...register('gig_time')}
                    type="time"
                    className="pl-10"
                  />
                </div>
                <FieldError message={errors.gig_time?.message} />
              </div>
            </div>

            {errors.root && (
              <div className="rounded-2xl border border-rose-100 dark:border-slate-700 bg-rose-50 dark:bg-rose-900/30 p-4 text-xs font-bold text-rose-700 dark:text-rose-300">
                ⚠️ {errors.root.message}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
              {isSubmitting ? 'Broadcasting to Volunteers...' : 'Publish & Match Gig'}
            </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

