import { useState, memo } from 'react';
import { Progress } from '@/components/ui/progress';
import { updateGigStatus } from '../services/gigs';
import type { Gig, GigStatus } from '../types/database';
import { parseGigLocation } from '../utils/geo';

interface NgoGigCardProps {
  gig: Gig;
  onUpdated: () => void;
}

const STATUS_THEME: Record<
  GigStatus,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  open: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200/50 dark:border-slate-700',
    dot: 'bg-emerald-500',
    label: 'Open for volunteers',
  },
  in_progress: {
    bg: 'bg-blue-50/70 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200/50 dark:border-slate-700',
    dot: 'bg-blue-500 animate-pulse',
    label: 'In Progress',
  },
  completed: {
    bg: 'bg-slate-50/70 dark:bg-slate-800/70',
    text: 'text-slate-700 dark:text-slate-200',
    border: 'border-slate-200/50 dark:border-slate-700/50',
    dot: 'bg-slate-400',
    label: 'Completed',
  },
  cancelled: {
    bg: 'bg-rose-50/70 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200/50 dark:border-slate-700',
    dot: 'bg-rose-500',
    label: 'Closed',
  },
};

function LocationDisplay({ gig }: { gig: Gig }) {
  const parsed = parseGigLocation(gig.location);
  if (!parsed) return null;
  return (
    <span
      className="flex items-center gap-1 select-none"
      title={`${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`}
    >
      <svg
        className="h-4 w-4 shrink-0 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span className="truncate max-w-[200px]">
        {gig.location_label || `${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)}`}
      </span>
    </span>
  );
}

export const NgoGigCard = memo(function NgoGigCard({ gig, onUpdated }: NgoGigCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gigDate = new Date(gig.gig_date);
  const timePart = gigDate.toTimeString().slice(0, 5);

  const runAction = async (action: () => Promise<void>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      onUpdated();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? String(err);
      console.error('[NgoGigCard] Action failed:', err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status: GigStatus) =>
    runAction(
      async () => {
        await updateGigStatus(gig.id, status);
      },
      status === 'cancelled'
        ? 'Close this gig? Volunteers will no longer see it on the map.'
        : undefined,
    );

  const isTerminal = gig.status === 'completed' || gig.status === 'cancelled';

  const fillRate =
    gig.volunteers_needed > 0 ? (gig.volunteers_joined / gig.volunteers_needed) * 100 : 0;
  const cappedFillRate = Math.min(fillRate, 100);
  const progressTheme =
    fillRate >= 100 ? 'bg-emerald-500' : fillRate >= 50 ? 'bg-teal-500' : 'bg-amber-500';

  const currentTheme = STATUS_THEME[gig.status];

  return (
    <article className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-xs hover:border-emerald-100 hover:shadow-md hover:shadow-emerald-950/2 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none dark:shadow-slate-900/50 dark:hover:border-slate-600 transition-all duration-300 ease-out">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-snug group-hover:text-emerald-900 transition-colors">
              {gig.title}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentTheme.dot}`} />
              {currentTheme.label}
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium line-clamp-2 pt-0.5">
            {gig.description}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-slate-400 font-semibold pt-1">
            <span className="flex items-center gap-1 select-none">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {gigDate.toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1 select-none">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {timePart}
            </span>
            <LocationDisplay gig={gig} />
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100/50 p-3 max-w-xl dark:bg-slate-800 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-gray-500 dark:text-slate-400">Spots Filled</span>
              <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[11px] dark:text-emerald-400 dark:bg-emerald-900/30">
                {gig.volunteers_joined} / {gig.volunteers_needed} spots ({Math.round(fillRate)}%)
              </span>
            </div>
            <Progress value={cappedFillRate} indicatorClassName={progressTheme} />
          </div>

          {gig.required_skills.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {gig.required_skills.map((s) => (
                <span
                  key={s}
                  className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 hover:border-emerald-200 hover:text-emerald-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-600 dark:bg-rose-900/30 dark:border-rose-900/50 dark:text-rose-400"
          role="alert"
        >
          <svg
            className="h-4 w-4 shrink-0 text-rose-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="no-print mt-5 flex flex-wrap items-center gap-2 border-t border-gray-50 dark:border-slate-700 pt-4">
          {!isTerminal && (
            <>
              {gig.status === 'open' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus('in_progress')}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10 hover:shadow-md dark:shadow-none dark:shadow-slate-900/50 transition-all duration-200 disabled:opacity-50"
                >
                  {busy && (
                    <svg
                      className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white inline"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  Start Gig
                </button>
              )}
              {(gig.status === 'open' || gig.status === 'in_progress') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus('completed')}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/10 hover:shadow-md dark:shadow-none dark:shadow-slate-900/50 transition-all duration-200 disabled:opacity-50"
                >
                  {busy && (
                    <svg
                      className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white inline"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  Mark Completed
                </button>
              )}
              {(gig.status === 'open' || gig.status === 'in_progress') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus('cancelled')}
                  className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/30 dark:hover:border-rose-700 transition-all duration-200 disabled:opacity-50"
                >
                  Close Gig
                </button>
              )}
            </>
          )}
          {gig.status === 'cancelled' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus('open')}
              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-3.5 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 dark:border-slate-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-700 transition-all duration-200 disabled:opacity-50"
            >
              Reopen Gig
            </button>
          )}
        </div>
    </article>
  );
});
