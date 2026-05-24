import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export function Avatar({
  src,
  alt = '',
  fallback,
  className,
  size = 'md',
}: AvatarProps) {
  const [error, setError] = React.useState(false);

  const fallbackText = fallback ?? (alt ? alt.charAt(0).toUpperCase() : '?');

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 font-black text-white shadow-md',
        sizeMap[size],
        className
      )}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full rounded-full object-cover"
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : (
        <span>{fallbackText}</span>
      )}
    </div>
  );
}
