import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-xl border px-3 py-1 text-xs font-bold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        secondary: 'border-slate-200 bg-slate-50 text-slate-600',
        destructive: 'border-red-200 bg-red-50 text-red-700',
        outline: 'border-slate-200 text-slate-500',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
