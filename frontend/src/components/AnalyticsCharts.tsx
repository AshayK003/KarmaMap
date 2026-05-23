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
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChartDataPoint {
  name: string;
  volunteers: number;
  completed: number;
}

interface AnalyticsChartsProps {
  data: ChartDataPoint[];
}

type ChartType = 'bar' | 'area';

// Custom lightweight modern tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-emerald-50 bg-white/95 p-3 shadow-lg backdrop-blur-xs select-none">
        <p className="text-xs font-bold text-gray-800 mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-[11px] font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-gray-500">{entry.name}</span>
              </div>
              <span className="text-gray-950 font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm font-medium text-gray-400">No active gig analytics recorded yet.</p>
        <p className="text-xs text-gray-300 mt-1">Publish new volunteer gigs to see real-time interaction metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart controls */}
      <div className="flex items-center justify-end gap-1.5 border-b border-gray-50 pb-3">
        <span className="text-xs font-semibold text-gray-400 mr-auto uppercase tracking-wider">Visual mode</span>
        <button
          type="button"
          onClick={() => setChartType('bar')}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide transition-all duration-200 ${
            chartType === 'bar'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Bar View
        </button>
        <button
          type="button"
          onClick={() => setChartType('area')}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide transition-all duration-200 ${
            chartType === 'area'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Area Flow
        </button>
      </div>

      {/* Chart container */}
      <div className="h-72 w-full transition-all duration-500">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis 
                allowDecimals={false} 
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
                tickLine={false}
                axisLine={false}
                dx={-6}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
              <Bar dataKey="volunteers" fill="#059669" name="Volunteers joined" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="completed" fill="#f59e0b" name="Completed" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis 
                allowDecimals={false} 
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
                tickLine={false}
                axisLine={false}
                dx={-6}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
              <Area type="monotone" dataKey="volunteers" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolunteers)" name="Volunteers joined" />
              <Area type="monotone" dataKey="completed" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

