import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardCard } from '../components/DashboardCard';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { NgoGigCard } from '../components/NgoGigCard';
import { useAuth } from '../context/AuthContext';
import { useRealtimeGigs } from '../hooks/useRealtimeGigs';
import { fetchNgoAnalytics } from '../services/gigs';
import type { GigStatus } from '../types/database';

type FilterKey = 'all' | GigStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Closed' },
];

export function NgoDashboard() {
  const { profile } = useAuth();
  const { gigs, refetch } = useRealtimeGigs(profile?.id);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [analytics, setAnalytics] = useState<{
    total_hours: number;
    completed_gigs: number;
    total_gigs: number;
    chart_data: Array<{ name: string; volunteers: number; completed: number }>;
  } | null>(null);

  useEffect(() => {
    fetchNgoAnalytics()
      .then(setAnalytics)
      .catch(console.error);
  }, [gigs]);

  const filteredGigs = useMemo(() => {
    if (filter === 'all') return gigs;
    return gigs.filter((g) => g.status === filter);
  }, [gigs, filter]);

  const handlePrint = () => window.print();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 print:p-8">
      <div className="no-print flex items-center justify-between">
        <h1 className="text-2xl font-bold">NGO Dashboard</h1>
        <div className="flex gap-2">
          <Link
            to="/ngo/create-gig"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            Create gig
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-emerald-600 px-4 py-2 text-sm text-emerald-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <DashboardCard
          title="Total volunteer hours"
          value={analytics?.total_hours ?? 0}
          icon="⏱️"
        />
        <DashboardCard
          title="Completed gigs"
          value={analytics?.completed_gigs ?? 0}
          icon="✅"
        />
        <DashboardCard
          title="Total gigs"
          value={analytics?.total_gigs ?? gigs.length}
          icon="📋"
        />
      </div>

      <div className="mt-8 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
        <h2 className="mb-4 font-semibold">Gig analytics</h2>
        <AnalyticsCharts data={analytics?.chart_data ?? []} />
      </div>

      <div className="no-print mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Manage gigs</h2>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filter === f.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredGigs.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
            No gigs in this category.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredGigs.map((g) => (
              <NgoGigCard key={g.id} gig={g} onUpdated={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
