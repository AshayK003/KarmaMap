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
  return <p className="mt-1.5 text-xs font-bold text-rose-600">{message}</p>;
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
      <div className="mb-8 border-b border-emerald-100/60 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-800">
          Create Volunteer Opportunity
        </h1>
        <p className="text-sm font-semibold text-slate-400 mt-1">
          Specify location coordinates and details to matching volunteers near you.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* ─── Left Column: Geospatial Location Settings ─── */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[76px]">
          <div className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-800">Geospatial Center</h2>
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
                  <button
                    type="button"
                    onClick={() => setShowMap(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    Hide Map Picker
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-700 transition-all cursor-pointer"
                >
                  Show Map Picker
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Column: Opportunity Context Form ─── */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md p-6 shadow-md space-y-6"
            noValidate
          >
            <div>
              <h2 className="text-base font-black text-slate-800">Opportunity Details</h2>
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
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
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
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
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
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
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
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <FieldError message={errors.volunteers_needed?.message} />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Gig Date
                </label>
                <input
                  {...register('gig_date')}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  onChange={(e) => {
                    register('gig_date').onChange(e);
                    e.target.blur();
                  }}
                />
                <FieldError message={errors.gig_date?.message} />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Gig Time
                </label>
                <input
                  {...register('gig_time')}
                  type="time"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  onChange={(e) => {
                    register('gig_time').onChange(e);
                    e.target.blur();
                  }}
                />
                <FieldError message={errors.gig_time?.message} />
              </div>
            </div>

            {errors.root && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold text-rose-700">
                ⚠️ {errors.root.message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-4 text-sm font-black text-white shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Broadcasting to Volunteers...</span>
                </>
              ) : (
                'Publish & Match Gig'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

