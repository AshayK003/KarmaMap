import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DashboardCard } from '../components/DashboardCard';
import { AwardIcon, Building2Icon, ClockIcon, UsersIcon } from '../components/NavIcons';
import type { OrgAnalytics } from '../types/database';
import { apiFetch } from '../utils/api';

export function OrganizationDashboard() {
  const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, n] = await Promise.all([
        apiFetch<OrgAnalytics>('/api/organizations/analytics'),
        apiFetch<{ name: string | null }>('/api/organizations/org-name'),
      ]);
      setAnalytics(a);
      setOrgName(n.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = useCallback(() => {
    if (!analytics) return;

    const header = 'Volunteer Name,Gig Title,Hours,Date';
    const rows = analytics.recent_activities.map(
      (a) => `"${a.volunteer_name}","${a.gig_title}",${a.hours},"${a.date}"`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karmamap-impact-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analytics]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className="flex min-h-[50vh] items-center justify-center"
          role="status"
          aria-label="Loading dashboard"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Building2Icon className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h2 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-2">
            Dashboard Unavailable
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Building2Icon className="h-7 w-7 text-emerald-600" />
            {orgName ? `${orgName} Impact Dashboard` : 'Organization Dashboard'}
          </h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Track your team's verified volunteer impact, hours, and ESG metrics.
          </p>
        </div>
        <Button onClick={exportCSV}>
          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV Report
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <DashboardCard
          title="Total Volunteer Hours"
          value={`${analytics.total_hours}h`}
          subtitle={`Across ${analytics.completed_count} completed activities`}
          icon={<AwardIcon className="h-5 w-5" />}
          gradient="from-emerald-500 to-teal-400"
        />
        <DashboardCard
          title="Active Volunteers"
          value={analytics.active_members}
          subtitle={`Out of ${analytics.total_members} total team members`}
          icon={<UsersIcon className="h-5 w-5" />}
          gradient="from-blue-500 to-cyan-400"
        />
        <DashboardCard
          title="Completed Activities"
          value={analytics.completed_count}
          subtitle="Verified participations"
          icon={<ClockIcon className="h-5 w-5" />}
          gradient="from-amber-500 to-orange-400"
        />
        <DashboardCard
          title="Team Members"
          value={analytics.total_members}
          subtitle="Registered in the organization"
          icon={<Building2Icon className="h-5 w-5" />}
          gradient="from-purple-500 to-pink-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1">
            Hours by Department
          </h2>
          <p className="text-xs font-semibold text-slate-400 mb-4">
            Breakdown of volunteer hours across departments
          </p>
          {analytics.hours_by_department.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-slate-400">
              No data yet
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.hours_by_department}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    dx={-4}
                    width={32}
                  />
                  <Tooltip cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
                  <Bar dataKey="hours" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1">
            Hours Over Time
          </h2>
          <p className="text-xs font-semibold text-slate-400 mb-4">Monthly volunteer hours trend</p>
          {analytics.hours_by_month.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-slate-400">
              No data yet
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.hours_by_month}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    dx={-4}
                    width={32}
                  />
                  <Tooltip cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorHours)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1">
          Recent Activities
        </h2>
        <p className="text-xs font-semibold text-slate-400 mb-4">
          Latest verified volunteer activities from your team
        </p>
        {analytics.recent_activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-slate-400">No completed activities yet</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
              Activities will appear once team members complete verified gigs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-3 px-2 text-xs font-black uppercase tracking-widest text-slate-400">
                    Volunteer
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-black uppercase tracking-widest text-slate-400">
                    Gig
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-black uppercase tracking-widest text-slate-400">
                    Hours
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-black uppercase tracking-widest text-slate-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent_activities.map((a, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-2 font-bold text-slate-700 dark:text-slate-200">
                      {a.volunteer_name}
                    </td>
                    <td className="py-3 px-2 text-slate-500 dark:text-slate-400">{a.gig_title}</td>
                    <td className="py-3 px-2 text-right font-bold text-emerald-600">{a.hours}h</td>
                    <td className="py-3 px-2 text-right text-slate-400 text-xs">
                      {a.date?.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
