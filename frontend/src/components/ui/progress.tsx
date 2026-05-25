import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50 dark:bg-slate-700 dark:border-slate-600/50',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          indicatorClassName ?? 'bg-gradient-to-r from-emerald-500 to-teal-500'
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
