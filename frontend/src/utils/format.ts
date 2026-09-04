type DateLike = string | Date | number;

export const INVALID_DATE_FALLBACK = 'Invalid date';

export function formatDate(date: DateLike, options: Intl.DateTimeFormatOptions): string {
  const parsed = new Date(date);
  // A corrupt gig_date must never crash a whole route (RangeError otherwise).
  if (Number.isNaN(parsed.getTime())) return INVALID_DATE_FALLBACK;
  try {
    return new Intl.DateTimeFormat('en-US', options).format(parsed);
  } catch {
    return INVALID_DATE_FALLBACK;
  }
}

/** Escape text per RFC5545 so commas/semicolons can't corrupt .ics downloads. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Strip characters that are illegal in filenames on major OSes. */
export function safeIcsFilename(title: string): string {
  const base = title
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base || 'gig'}.ics`;
}
