import { useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} from '@/components/ui/chart';

interface ChartDataPoint {
  name: string;
  volunteers: number;
  completed: number;
}

interface AnalyticsChartsProps {
  data: ChartDataPoint[];
}

type ChartType = 'bar' | 'area';

const chartConfig = {
  volunteers: { label: 'Volunteers joined', color: '#059669' },
  completed: { label: 'Completed', color: '#f59e0b' },
};

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm font-medium text-gray-400 dark:text-slate-400">No active gig analytics recorded yet.</p>
        <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">Publish new volunteer gigs to see real-time interaction metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1.5 border-b border-gray-50 dark:border-slate-700 pb-3">
        <span className="text-xs font-semibold text-gray-400 dark:text-slate-400 mr-auto uppercase tracking-wider">Visual mode</span>
        <button
          type="button"
          aria-pressed={chartType === 'bar'}
          onClick={() => setChartType('bar')}
          className={`rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
            chartType === 'bar'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Bar View
        </button>
        <button
          type="button"
          aria-pressed={chartType === 'area'}
          onClick={() => setChartType('area')}
          className={`rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
            chartType === 'area'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Area Flow
        </button>
      </div>

      <div className="h-64 sm:h-72 w-full transition-all duration-500">
        <ChartContainer config={chartConfig} height={256}>
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:[&>path]:stroke-slate-700" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dx={-4}
                width={24}
              />
              <Tooltip content={<ChartTooltipContent />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} content={<ChartLegendContent />} />
              <Bar dataKey="volunteers" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="completed" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="colorVolunteers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:[&>path]:stroke-slate-700" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dx={-4}
                width={24}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="volunteers" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolunteers)" />
              <Area type="monotone" dataKey="completed" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" />
            </AreaChart>
          )}
        </ChartContainer>
      </div>
    </div>
  );
}
