import { Award, Calendar, Clock, Handshake, Leaf, Sparkles } from 'lucide-react';
import type { Participation } from '../types/database';

interface CertificateProps {
  volunteerName: string;
  participation: Participation;
  gigTitle: string;
  completedDate: string;
}

export function Certificate({
  volunteerName,
  participation,
  gigTitle,
  completedDate,
}: CertificateProps) {
  return (
    <div className="certificate relative mx-auto max-w-lg overflow-hidden rounded-2xl bg-gradient-to-b from-amber-50 to-white p-6 sm:p-8 text-center shadow-lg">
      {/* Decorative corner ornaments */}
      <div className="absolute top-3 left-3 text-2xl opacity-30 select-none">✦</div>
      <div className="absolute top-3 right-3 text-2xl opacity-30 select-none">✦</div>
      <div className="absolute bottom-3 left-3 text-2xl opacity-30 select-none">✦</div>
      <div className="absolute bottom-3 right-3 text-2xl opacity-30 select-none">✦</div>

      {/* Top gold accent line */}
      <div className="mx-auto mb-5 h-1 w-24 rounded-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />

      {/* Icon */}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md select-none">
        <Award className="h-7 w-7" />
      </div>

      {/* Title */}
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-amber-600">
        Certificate of Impact
      </p>

      {/* Divider */}
      <div className="mx-auto my-3 flex items-center gap-2 text-amber-300">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-300" />
        <span className="text-xs">◈</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-300" />
      </div>

      {/* Volunteer name */}
      <h2 className="font-serif text-3xl font-bold tracking-tight text-slate-900">
        {volunteerName}
      </h2>

      <p className="mt-4 text-sm font-semibold text-slate-500">
        has successfully completed the volunteer gig
      </p>

      <p className="mt-2 text-xl font-bold text-emerald-700">{gigTitle}</p>

      {/* Hours & date */}
      <div className="mx-auto mt-4 inline-flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {participation.hours ?? 0} hours
        </span>
        <span className="text-slate-300">|</span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" /> {completedDate}
        </span>
      </div>

      {/* Divider */}
      <div className="mx-auto my-4 flex items-center gap-2 text-amber-300">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-300" />
        <span className="text-xs">◈</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-300" />
      </div>

      {/* Icons row */}
      <div className="flex justify-center gap-3 select-none text-emerald-600">
        <Leaf className="h-6 w-6" />
        <Sparkles className="h-6 w-6 text-amber-500" />
        <Handshake className="h-6 w-6" />
      </div>

      {/* Verified footer */}
      <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-[10px] font-bold text-slate-400">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white font-black">
          ✓
        </span>
        Verified by KarmaMap
      </div>

      {/* Bottom gold accent line */}
      <div className="mx-auto mt-5 h-1 w-24 rounded-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
    </div>
  );
}
