import * as React from 'react';
import { ResponsiveContainer, type ResponsiveContainerProps } from 'recharts';
import { cn } from '@/lib/utils';

interface ChartConfig {
  [key: string]: {
    label: string;
    color: string;
  };
}

const ChartContext = React.createContext<{
  config: ChartConfig;
} | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within <ChartContainer>');
  return ctx;
}

interface ChartContainerProps extends ResponsiveContainerProps {
  config: ChartConfig;
  children: React.ReactElement;
  className?: string;
}

export function ChartContainer({ config, children, className, ...props }: ChartContainerProps) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn('w-full', className)}>
        <ResponsiveContainer width="100%" height={props.height ?? 260} {...props}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    fill?: string;
  }>;
  label?: string;
  hideLabel?: boolean;
  indicator?: 'dot' | 'line';
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel,
  indicator = 'dot',
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-emerald-50 bg-white/95 p-3 shadow-lg backdrop-blur-xs select-none dark:border-slate-700 dark:bg-slate-800/95">
      {!hideLabel && label && (
        <p className="text-xs font-bold text-gray-800 dark:text-slate-200 mb-1.5">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const cfg = config[entry.name];
          const color = entry.color ?? entry.fill ?? cfg?.color ?? '#059669';
          return (
            <div key={i} className="flex items-center justify-between gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                {indicator === 'dot' ? (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                ) : (
                  <span className="h-3 w-0.5 rounded-full" style={{ backgroundColor: color }} />
                )}
                <span className="text-gray-500 dark:text-slate-400">
                  {cfg?.label ?? entry.name}
                </span>
              </div>
              <span className="text-gray-950 dark:text-slate-100 font-bold">{entry.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ChartLegendContentProps {
  payload?: Array<{
    value: string;
    color?: string;
  }>;
}

export function ChartLegendContent({ payload }: ChartLegendContentProps) {
  const { config } = useChart();

  return (
    <div className="flex flex-wrap items-center gap-4 pt-2">
      {payload?.map((entry, i) => {
        const cfg = config[entry.value];
        const color = entry.color ?? cfg?.color ?? '#059669';
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {cfg?.label ?? entry.value}
          </div>
        );
      })}
    </div>
  );
}
