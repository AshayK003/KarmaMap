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
    <div className="certificate mx-auto max-w-lg rounded-2xl border-4 border-amber-400 bg-gradient-to-b from-amber-50 to-white p-8 text-center shadow-lg">
      <p className="text-sm uppercase tracking-widest text-amber-600">
        Certificate of Impact
      </p>
      <h2 className="mt-4 font-serif text-2xl font-bold text-gray-900">
        {volunteerName}
      </h2>
      <p className="mt-4 text-gray-600">
        has successfully completed the volunteer gig
      </p>
      <p className="mt-2 text-xl font-semibold text-emerald-700">{gigTitle}</p>
      <p className="mt-4 text-sm text-gray-500">
        {participation.hours ?? 0} hours contributed · {completedDate}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <span className="text-3xl">🌱</span>
        <span className="text-3xl">✨</span>
        <span className="text-3xl">🤝</span>
      </div>
      <p className="mt-4 text-xs text-gray-400">Verified by KarmaMap</p>
    </div>
  );
}
