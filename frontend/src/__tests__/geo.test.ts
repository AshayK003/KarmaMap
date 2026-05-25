import { describe, expect, it } from 'vitest';
import {
  calculateHaversineDistance,
  estimateTravelTime,
  formatDistance,
  generatePortfolioSlug,
  parseGigLocation,
  skillOverlapScore,
} from '../utils/geo';

describe('formatDistance', () => {
  it('shows meters below 1000', () => {
    expect(formatDistance(500)).toBe('500 m');
  });

  it('shows kilometers at or above 1000', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(1500)).toBe('1.5 km');
  });

  it('handles 0', () => {
    expect(formatDistance(0)).toBe('0 m');
  });
});

describe('skillOverlapScore', () => {
  it('returns 100 when no skills required', () => {
    expect(skillOverlapScore([], ['a'])).toBe(100);
  });

  it('returns 100 on full match', () => {
    expect(skillOverlapScore(['a', 'b'], ['a', 'b'])).toBe(100);
  });

  it('returns 50 on half match', () => {
    expect(skillOverlapScore(['a', 'b'], ['a'])).toBe(50);
  });

  it('returns 0 on no match', () => {
    expect(skillOverlapScore(['a', 'b'], ['c'])).toBe(0);
  });

  it('is case insensitive', () => {
    expect(skillOverlapScore(['First Aid'], ['first aid'])).toBe(100);
  });
});

describe('generatePortfolioSlug', () => {
  it('replaces spaces with hyphens and appends timestamp', () => {
    const slug = generatePortfolioSlug('John Doe');
    expect(slug).toMatch(/^john-doe-[a-z0-9]+$/);
  });

  it('handles single name', () => {
    const slug = generatePortfolioSlug('Alice');
    expect(slug).toMatch(/^alice-[a-z0-9]+$/);
  });
});

describe('estimateTravelTime', () => {
  it('shows walk time for short distance', () => {
    expect(estimateTravelTime(500)).toMatch(/min walk/);
  });

  it('shows drive time for long distance', () => {
    expect(estimateTravelTime(5000)).toMatch(/min drive/);
  });

  it('handles 0', () => {
    expect(estimateTravelTime(0)).toMatch(/min walk/);
  });
});

describe('parseGigLocation', () => {
  it('parses GeoJSON Point format', () => {
    const result = parseGigLocation({ type: 'Point', coordinates: [77.2, 28.6] });
    expect(result).toEqual({ lng: 77.2, lat: 28.6 });
  });

  it('parses EWKT format', () => {
    const result = parseGigLocation('SRID=4326;POINT(77.2 28.6)');
    expect(result).toEqual({ lng: 77.2, lat: 28.6 });
  });

  it('parses plain POINT format', () => {
    const result = parseGigLocation('POINT(77.2 28.6)');
    expect(result).toEqual({ lng: 77.2, lat: 28.6 });
  });

  it('returns null for null input', () => {
    expect(parseGigLocation(null)).toBeNull();
  });

  it('returns null for malformed object', () => {
    expect(parseGigLocation({})).toBeNull();
  });

  it('returns null for random string', () => {
    expect(parseGigLocation('garbage')).toBeNull();
  });

  it('handles POINT with negative longitude', () => {
    const result = parseGigLocation('POINT(-0.1276 51.5074)');
    expect(result).toEqual({ lng: -0.1276, lat: 51.5074 });
  });
});

describe('calculateHaversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(calculateHaversineDistance(28.6, 77.2, 28.6, 77.2)).toBe(0);
  });

  it('calculates Delhi to Mumbai distance approximately', () => {
    const dist = calculateHaversineDistance(28.6, 77.2, 19.076, 72.8777);
    expect(dist).toBeGreaterThan(1_000_000);
    expect(dist).toBeLessThan(1_500_000);
  });

  it('is symmetrical', () => {
    const a = calculateHaversineDistance(28.6, 77.2, 19.076, 72.8777);
    const b = calculateHaversineDistance(19.076, 72.8777, 28.6, 77.2);
    expect(a).toBe(b);
  });

  it('handles very small distances', () => {
    const dist = calculateHaversineDistance(28.6139, 77.209, 28.614, 77.209);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(100);
  });
});
