import type { GigStatus } from '../types/database';

export const GIG_STATUS_LABELS: Record<GigStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Closed',
};

export const GIG_STATUS_STYLES: Record<GigStatus, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};
