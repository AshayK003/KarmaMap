import { Link } from 'react-router-dom';
import type { NearbyGig } from '../types/database';
import { formatDistance, skillOverlapScore } from '../utils/geo';

interface GigCardProps {
  gig: NearbyGig;
  volunteerSkills?: string[];
}

export function GigCard({ gig, volunteerSkills = [] }: GigCardProps) {
  const overlap = skillOverlapScore(gig.required_skills, volunteerSkills);

  return (
    <article className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{gig.title}</h3>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
          {formatDistance(gig.distance_meters)}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{gig.ngo_name}</p>
      <p className="mt-2 line-clamp-2 text-sm text-gray-600">{gig.description}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {gig.required_skills.map((skill) => (
          <span
            key={skill}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
          >
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          {gig.volunteers_joined}/{gig.volunteers_needed} volunteers
        </span>
        <span className="font-medium text-emerald-600">{overlap}% skill match</span>
      </div>
      <Link
        to={`/gigs/${gig.id}`}
        className="mt-3 block w-full rounded-lg bg-emerald-600 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
      >
        View details
      </Link>
    </article>
  );
}
