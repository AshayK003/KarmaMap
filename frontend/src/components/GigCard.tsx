import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { NearbyGig } from '../types/database';
import { formatDistance, skillOverlapScore, estimateTravelTime } from '../utils/geo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface GigCardProps {
  gig: NearbyGig;
  volunteerSkills?: string[];
}

function SkillMatchBadge({ overlap }: { overlap: number }) {
  const variant = overlap >= 75 ? 'default' as const : overlap >= 40 ? 'amber' as const : 'secondary' as const;
  return (
    <Badge variant={variant} className="gap-1 text-[10px] sm:text-xs">
      <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={overlap >= 40 ? 'M9 12l2 2 4-4' : 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'} />
      </svg>
      {overlap}% match
    </Badge>
  );
}

export const GigCard = memo(function GigCard({ gig, volunteerSkills = [] }: GigCardProps) {
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

  const travelTime = estimateTravelTime(gig.distance_meters);
  const isFeatured = gig.featured_until && new Date(gig.featured_until) > new Date();

  return (
    <article className="group relative flex flex-col rounded-2xl border border-emerald-50/50 bg-white p-5 shadow-xs hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-950/3 hover:border-emerald-100/80 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none dark:shadow-slate-900/50 dark:hover:border-slate-600 dark:hover:shadow-none dark:hover:shadow-slate-900/50 transition-all duration-300 ease-out overflow-hidden">
      {/* Featured ribbon */}
      {isFeatured && (
        <div className="absolute top-3 right-0 z-10">
          <div className="relative">
            <svg className="h-7 w-7 text-amber-400 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white pt-0.5">FEATURED</span>
          </div>
        </div>
      )}
      {/* Subtle top accent line — color shifts with skill match */}
      <div className={`absolute top-0 left-0 h-[3px] w-full ${isFeatured ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : overlap >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : overlap >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-300' : 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500'}`} />

      {/* Header: title + distance */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-emerald-900 transition-colors line-clamp-2 flex-1">
          {gig.title}
        </h3>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <Badge variant="secondary" className="text-[10px] sm:text-xs px-2.5 py-0.5">{formatDistance(gig.distance_meters)}</Badge>
          <span className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 tracking-wide uppercase select-none">
            {travelTime}
          </span>
        </div>
      </div>

      {/* NGO name */}
      <p className="mt-1.5 text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 opacity-90">{gig.ngo_name}</p>

      {/* Description */}
      <p className="mt-2 line-clamp-2 text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 leading-relaxed flex-1">
        {gig.description}
      </p>

      {/* Skills tags with dynamic profile skill matching highlights */}
      {gig.required_skills.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {gig.required_skills.map((skill) => {
            const hasSkill = volunteerSkills.some(
              (s) => s.toLowerCase() === skill.toLowerCase()
            );
            return (
              <Badge key={skill} variant={hasSkill ? 'default' : 'secondary'} className="gap-0.5 text-[10px] sm:text-xs px-2.5 py-0.5">
                {hasSkill && (
                  <svg className="h-2.5 w-2.5 mr-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {skill}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Volunteer spots progress bar */}
      <div className="mt-4.5 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold">
          <span className="text-slate-400 dark:text-slate-500">Spots filled</span>
          <span className="text-slate-600 font-extrabold dark:text-slate-300">
            {gig.volunteers_joined}/{gig.volunteers_needed}
            {spotsLeft > 0 && (
              <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-black">· {spotsLeft} left</span>
            )}
          </span>
        </div>
        <Progress value={fillRate} indicatorClassName={progressColor} />
      </div>

      {/* Footer: skill match + CTA */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-50 dark:border-slate-700 pt-3">
        <SkillMatchBadge overlap={overlap} />
        <Link to={`/gigs/${gig.id}`}>
          <Button size="sm">View details</Button>
        </Link>
      </div>
    </article>
  );
});

