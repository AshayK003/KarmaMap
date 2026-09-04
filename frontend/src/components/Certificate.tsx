import { Calendar, Clock } from 'lucide-react';
import type { Participation } from '../types/database';

interface CertificateProps {
  volunteerName: string;
  participation: Participation;
  gigTitle: string;
  completedDate: string;
  orgName?: string;
  verifyUrl?: string;
}

/**
 * Printable certificate of impact. Formal document language: double-rule
 * frame, generous whitespace, one embossed-style seal motif built from
 * circles plus a Lucide check. No decorative glyphs.
 */
export function Certificate({
  volunteerName,
  participation,
  gigTitle,
  completedDate,
  orgName,
  verifyUrl,
}: CertificateProps) {
  const certificateId = `KM-${String(participation.id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const hours = Number(participation.hours ?? 0);

  return (
    <div className="certificate relative mx-auto max-w-xl bg-white p-2 shadow-lg print:shadow-none [print-color-adjust:exact]">
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

          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24" role="img" aria-label="Verified by KarmaMap seal">
              <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
                <defs>
                  <path
                    id="km-seal-arc"
                    d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
                    fill="none"
                  />
                </defs>
                <circle cx="60" cy="60" r="57" fill="none" stroke="#065f46" strokeWidth="2" />
                <circle cx="60" cy="60" r="34" fill="none" stroke="#d97706" strokeWidth="1" />
                <text fontSize="10.5" fontWeight="800" letterSpacing="2.5" fill="#065f46">
                  <textPath href="#km-seal-arc">VERIFIED • KARMAMAP • VERIFIED •</textPath>
                </text>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-emerald-800">
                KM
              </span>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800">
              Verified by KarmaMap
            </p>
            {verifyUrl && (
              <p className="max-w-xs break-all font-mono text-[10px] text-slate-400">
                Verify at {verifyUrl.replace(/^https?:\/\//, '')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
