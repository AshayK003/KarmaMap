type DateLike = string | Date | number;

export function formatDate(
  date: DateLike,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
}
