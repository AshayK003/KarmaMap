import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/format';
import { DashboardCard } from '../components/DashboardCard';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { NgoGigCard } from '../components/NgoGigCard';
import { useAuth } from '../context/AuthContext';
import { useRealtimeGigs } from '../hooks/useRealtimeGigs';
import { fetchNgoAnalytics } from '../services/gigs';
import type { GigStatus } from '../types/database';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FilterKey = 'all' | GigStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Gigs' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Closed' },
];

export function NgoDashboard() {
  const { profile } = useAuth();
  const { gigs, refetch } = useRealtimeGigs(profile?.id);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [analytics, setAnalytics] = useState<{
    total_hours: number;
    completed_gigs: number;
    total_gigs: number;
    chart_data: Array<{ name: string; volunteers: number; completed: number }>;
  } | null>(null);
  const analyticsTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (analyticsTimer.current) clearTimeout(analyticsTimer.current);
    analyticsTimer.current = setTimeout(() => {
      fetchNgoAnalytics()
        .then(setAnalytics)
        .catch(console.error);
    }, 2000);
    return () => { if (analyticsTimer.current) clearTimeout(analyticsTimer.current); };
  }, [gigs]);

  // Debounce search input by 250ms to avoid filtering on every keystroke
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // Combine category filter AND debounced search filter
  const filteredGigs = useMemo(() => {
    let result = gigs;
    if (filter !== 'all') {
      result = result.filter((g) => g.status === filter);
    }
    if (debouncedQuery.trim() !== '') {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.required_skills.some((skill) => skill.toLowerCase().includes(q))
      );
    }
    return result;
  }, [gigs, filter, debouncedQuery]);

  const handlePrint = () => window.print();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 print:p-8">
      {/* 1. Stunning Hero Welcome Banner */}
      <Card className="no-print relative overflow-hidden p-6">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-100/40 blur-3xl dark:bg-emerald-900/20 pointer-events-none select-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <Avatar size="lg" alt={profile?.name ?? 'NGO'} />

            <div className="space-y-0.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                Welcome back, {profile?.name || 'NGO'}
              </h1>
              <p className="text-xs font-bold text-slate-400">
                Coordinate gigs, track impact, and manage your volunteer community.
              </p>
            </div>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/ngo/create-gig">
              <Button size="sm" className="sm:size-default">Create a Gig</Button>
            </Link>
            <Button variant="outline" size="sm" className="sm:size-default" onClick={handlePrint}>Export Report</Button>
          </div>
        </div>
      </Card>

      {/* Print-only simple header to save ink and look professional */}
      <div className="print-only hidden border-b border-gray-200 dark:border-slate-700 pb-4">
        <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-400">{profile?.name || 'NGO'} Impact Summary</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Generated on {formatDate(new Date(), { month: 'short', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {/* 2. Premium Analytics Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard
          title="Total volunteer hours"
          value={analytics?.total_hours ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtitle="Impact hours generated"
          gradient="from-emerald-500 to-teal-400"
        />
        <DashboardCard
          title="Completed gigs"
          value={analytics?.completed_gigs ?? 0}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtitle="Successful events closed"
          gradient="from-blue-500 to-indigo-400"
        />
        <DashboardCard
          title="Total gigs hosted"
          value={analytics?.total_gigs ?? gigs.length}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          subtitle="Active & past opportunities"
          gradient="from-amber-500 to-orange-400"
        />
      </div>

      {/* 3. Analytics Chart Section */}
      <div className="rounded-3xl border border-white/20 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-5 shadow-md dark:shadow-none dark:shadow-slate-900/50">
        <h2 className="text-base font-black tracking-tight text-slate-800 dark:text-slate-100 mb-4 select-none">
          Volunteer and Completion Analytics
        </h2>
        <AnalyticsCharts data={analytics?.chart_data ?? []} />
      </div>

      {/* 4. Gig Management Shell */}
      <div className="no-print space-y-4">
        {/* Search & Categories toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
              Manage Opportunities
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Search, monitor, and transition status checkpoints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input Field */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 select-none">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or skills..."
                className="w-full pl-9 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedQuery('');
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-300 font-black text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Pill Filters */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                {FILTERS.map((f) => (
                  <TabsTrigger key={f.key} value={f.key}>
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* 5. Gigs List Display */}
        {filteredGigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-600 bg-white/40 dark:bg-slate-800/40 p-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-700 text-slate-400 mb-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">No gigs matched</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed font-semibold">
              {debouncedQuery || filter !== 'all'
                ? "We couldn't find any opportunities matching your active query or category filter. Try clearing your filters!"
                : "You haven't posted any gigs yet. Tap 'Create a Gig' at the top to publish your first opportunity!"}
            </p>
            {(debouncedQuery || filter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                  setFilter('all');
                }}
              >
                Reset Filter & Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGigs.map((g) => (
              <NgoGigCard key={g.id} gig={g} onUpdated={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
