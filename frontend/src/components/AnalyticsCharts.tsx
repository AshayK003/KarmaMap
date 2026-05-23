import {
  BarChart,
  Bar,
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

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">No gig data yet.</p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="volunteers" fill="#059669" name="Volunteers joined" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill="#f59e0b" name="Completed" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
