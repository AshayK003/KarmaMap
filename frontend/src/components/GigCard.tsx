import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { joinGigViaApi } from '../services/gigs';
import type { NearbyGig } from '../types/database';
import { estimateTravelTime, formatDistance, skillOverlapScore, urgencyLabel } from '../utils/geo';

interface GigCardProps {
  gig: NearbyGig;
  volunteerSkills?: string[];
  onJoined?: (gigId: string) => void;
}

export const GigCard = memo(function GigCard({
  gig,
  volunteerSkills = [],
  onJoined,
}: GigCardProps) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const overlap = skillOverlapScore(gig.required_skills, volunteerSkills);
  const fillRate =
    gig.volunteers_needed > 0
      ? Math.min((gig.volunteers_joined / gig.volunteers_needed) * 100, 100)
      : 0;
  const spotsLeft = Math.max(gig.volunteers_needed - gig.volunteers_joined, 0);
  const progressColor =
    fillRate >= 100 ? 'bg-emerald-500' : fillRate >= 60 ? 'bg-teal-500' : 'bg-amber-500';

  const travelTime = estimateTravelTime(gig.distance_meters);
  const urgency = urgencyLabel(gig);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (joining || joined) return;
    setJoining(true);
    try {
      await joinGigViaApi(gig.id);
      setJoined(true);
      toast.success('Joined gig! Check your portfolio.');
      onJoined?.(gig.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  return (
    <article className="group relative flex flex-col rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-950/3 dark:hover:border-slate-600 transition-all duration-300 ease-out overflow-hidden">
      {/* Top accent */}
      <div
        className={`absolute top-0 left-0 h-[3px] w-full ${
          urgency?.variant === 'destructive'
            ? 'bg-gradient-to-r from-rose-500 to-pink-400'
            : urgency?.variant === 'amber'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
              : overlap >= 0.75
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500'
        }`}
      />

      {/* Urgency badge row */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        {urgency && (
          <Badge variant={urgency.variant} className="gap-1 text-[10px] sm:text-xs px-2 py-0.5">
            {urgency.label}
          </Badge>
        )}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {formatDistance(gig.distance_meters)}
          </span>
          <span className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400">
            {travelTime}
          </span>
          {gig.duration && (
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {gig.duration}h
            </span>
          )}
        </div>
      </div>

      {/* Title + NGO */}
      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-emerald-900 transition-colors line-clamp-2">
        {gig.title}
      </h3>
      <p className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
        {gig.ngo_name}
      </p>

      {/* Description */}
      <p className="mt-1.5 line-clamp-2 text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 leading-relaxed flex-1">
        {gig.description}
      </p>

      {/* Skills */}
      {(gig.required_skills ?? []).length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(gig.required_skills ?? []).map((skill) => {
            const hasSkill = volunteerSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
            return (
              <Badge
                key={skill}
                variant={hasSkill ? 'default' : 'secondary'}
                className="gap-0.5 text-[10px] sm:text-xs px-2 py-0.5"
              >
                {hasSkill && (
                  <svg
                    className="h-2.5 w-2.5 mr-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {skill}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Progress */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold">
          <span className="text-slate-400 dark:text-slate-500">Spots filled</span>
          <span className="text-slate-600 font-extrabold dark:text-slate-300">
            {gig.volunteers_joined}/{gig.volunteers_needed}
            {spotsLeft > 0 && (
              <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-black">
                · {spotsLeft} left
              </span>
            )}
          </span>
        </div>
        <Progress value={fillRate} indicatorClassName={progressColor} />
      </div>

      {/* CTA row */}
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={handleJoin} disabled={joining || joined} className="flex-1">
          {joining ? 'Joining...' : joined ? '✓ Joined' : 'Join Now'}
        </Button>
        <Link to={`/gigs/${gig.id}`} className="shrink-0">
          <Button size="sm" variant="outline">
            Details
          </Button>
        </Link>
      </div>
    </article>
  );
});
