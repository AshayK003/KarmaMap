import { Link } from 'react-router-dom';
import type { NearbyGig } from '../types/database';
import { formatDistance, skillOverlapScore } from '../utils/geo';

interface GigCardProps {
  gig: NearbyGig;
  volunteerSkills?: string[];
}

function SkillMatchBadge({ overlap }: { overlap: number }) {
  if (overlap >= 75) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200/50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
        🎯 {overlap}% match
      </span>
    );
  }
  if (overlap >= 40) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700">
        ⚡ {overlap}% match
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200/50 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-500">
      🔍 {overlap}% match
    </span>
  );
}

export function GigCard({ gig, volunteerSkills = [] }: GigCardProps) {
  const overlap = skillOverlapScore(gig.required_skills, volunteerSkills);
  const fillRate = gig.volunteers_needed > 0
    ? Math.min((gig.volunteers_joined / gig.volunteers_needed) * 100, 100)
    : 0;
  const spotsLeft = Math.max(gig.volunteers_needed - gig.volunteers_joined, 0);
  const progressColor = fillRate >= 100
    ? 'bg-emerald-500'
    : fillRate >= 60
    ? 'bg-teal-500'
    : 'bg-amber-500';

  return (
    <article className="group relative flex flex-col rounded-2xl border border-emerald-50 bg-white p-5 shadow-xs hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-950/5 hover:border-emerald-100 transition-all duration-300 ease-out overflow-hidden">
      {/* Subtle top accent line — color shifts with skill match */}
      <div className={`absolute top-0 left-0 h-[3px] w-full ${overlap >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : overlap >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-300' : 'bg-gradient-to-r from-slate-200 to-slate-300'}`} />

      {/* Header: title + distance */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-extrabold text-gray-900 leading-snug group-hover:text-emerald-900 transition-colors line-clamp-2 flex-1">
          {gig.title}
        </h3>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
          📍 {formatDistance(gig.distance_meters)}
        </span>
      </div>

      {/* NGO name */}
      <p className="mt-1 text-xs font-bold text-emerald-700 opacity-80">{gig.ngo_name}</p>

      {/* Description */}
      <p className="mt-2 line-clamp-2 text-xs font-medium text-gray-500 leading-relaxed flex-1">
        {gig.description}
      </p>

      {/* Skills tags */}
      {gig.required_skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {gig.required_skills.map((skill) => (
            <span
              key={skill}
              className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Volunteer spots progress bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-gray-400">Spots filled</span>
          <span className="text-gray-700">
            {gig.volunteers_joined}/{gig.volunteers_needed}
            {spotsLeft > 0 && (
              <span className="ml-1 text-emerald-600">· {spotsLeft} left</span>
            )}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${fillRate}%` }}
          />
        </div>
      </div>

      {/* Footer: skill match + CTA */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <SkillMatchBadge overlap={overlap} />
        <Link
          to={`/gigs/${gig.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm shadow-emerald-500/10 hover:shadow-md transition-all duration-200 active:scale-95"
        >
          View details →
        </Link>
      </div>
    </article>
  );
}
