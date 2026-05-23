interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: string; // Optional custom top border gradient classes
}

export function DashboardCard({ title, value, subtitle, icon, gradient = 'from-emerald-500 to-teal-400' }: DashboardCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-emerald-100 bg-white p-6 shadow-xs hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-950/5 transition-all duration-300 ease-out">
      {/* Decorative top border gradient line */}
      <div className={`absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r ${gradient}`} />
      
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider uppercase text-gray-400">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-emerald-800 transition-colors group-hover:text-emerald-950">{value}</p>
        </div>
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-xs transition-transform duration-300 group-hover:scale-110 shrink-0">
            {icon}
          </div>
        )}
      </div>
      
      {subtitle && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {subtitle}
        </p>
      )}
    </div>
  );
}


