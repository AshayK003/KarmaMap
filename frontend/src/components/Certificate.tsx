import { BadgeCheck, Calendar, Clock } from 'lucide-react';
import type { Participation } from '../types/database';

interface CertificateProps {
  volunteerName: string;
  participation: Participation;
  gigTitle: string;
  completedDate: string;
  orgName?: string;
}

/**
 * Printable certificate of impact. Formal document language: double-rule
 * frame, generous whitespace, one seal motif. No decorative glyphs.
 */
export function Certificate({
  volunteerName,
  participation,
  gigTitle,
  completedDate,
  orgName,
}: CertificateProps) {
  const certificateId = `KM-${String(participation.id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const hours = Number(participation.hours ?? 0);

  return (
    <div className="certificate relative mx-auto max-w-xl bg-white p-2 shadow-lg print:shadow-none">
      <div className="border-2 border-emerald-900 px-6 py-10 text-center sm:px-12 print:border-emerald-900">
        <div className="border border-amber-400/60 px-4 py-8 sm:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-700">
            Certificate of Impact
          </p>

          <div className="mx-auto my-5 h-px w-24 bg-amber-400/70" />

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Proudly presented to
          </p>
          <h2 className="mt-2 font-serif text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {volunteerName}
          </h2>

          <p className="mx-auto mt-5 max-w-md text-sm font-medium leading-relaxed text-slate-600">
            For {hours} {hours === 1 ? 'hour' : 'hours'} of dedicated volunteer service
          </p>

          <p className="mt-3 text-2xl font-black tracking-tight text-emerald-800">{gigTitle}</p>

          {orgName && (
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              Awarded by {orgName}
            </p>
          )}

          <div className="mx-auto mt-6 flex max-w-sm flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {hours} {hours === 1 ? 'hour' : 'hours'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {completedDate}
            </span>
            <span className="font-mono tracking-wider text-slate-400">ID {certificateId}</span>
          </div>

          <div className="mx-auto my-6 h-px w-full max-w-xs bg-slate-200" />

          <div className="flex items-center justify-center gap-2 text-emerald-800">
            <BadgeCheck className="h-6 w-6" aria-hidden="true" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em]">
              Verified by KarmaMap
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
