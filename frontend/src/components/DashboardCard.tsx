interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

export function DashboardCard({ title, value, subtitle, icon }: DashboardCardProps) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-bold text-emerald-700">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
