import type { ReactNode } from 'react';

interface FieldErrorProps {
  message?: string;
  icon?: ReactNode;
}

export function FieldError({ message, icon }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1" role="alert">
      {icon && <span className="h-3.5 w-3.5 shrink-0">{icon}</span>}
      {message}
    </p>
  );
}
