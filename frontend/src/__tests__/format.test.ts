import { describe, expect, it } from 'vitest';
import { escapeIcsText, formatDate, safeIcsFilename } from '../utils/format';

describe('formatDate', () => {
  it('formats a valid date', () => {
    expect(formatDate('2026-06-15T09:00:00Z', { year: 'numeric' })).toContain('2026');
  });

  it('returns a fallback instead of throwing on garbage input', () => {
    expect(formatDate('not-a-date', { year: 'numeric' })).toBe('Invalid date');
    expect(formatDate('', { year: 'numeric' })).toBe('Invalid date');
  });
});

describe('escapeIcsText', () => {
  it('escapes RFC5545 special characters', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('leaves plain text untouched', () => {
    expect(escapeIcsText('Park cleanup')).toBe('Park cleanup');
  });
});

describe('safeIcsFilename', () => {
  it('replaces whitespace with underscores', () => {
    expect(safeIcsFilename('Park cleanup day')).toBe('Park_cleanup_day.ics');
  });

  it('strips filesystem-unsafe characters', () => {
    expect(safeIcsFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('abcdefghij.ics');
    expect(safeIcsFilename('a/b')).toBe('ab.ics');
  });
});
