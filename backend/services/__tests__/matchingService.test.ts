import { describe, it, expect } from 'vitest';
import { skillOverlap, normalizeDistance } from '../matchingService.js';

describe('skillOverlap', () => {
  it('returns 1 when no skills are required', () => {
    expect(skillOverlap([], ['a', 'b'])).toBe(1);
  });

  it('returns 1 when all required skills match', () => {
    expect(skillOverlap(['a', 'b'], ['a', 'b'])).toBe(1);
  });

  it('returns 0.5 when half the skills match', () => {
    expect(skillOverlap(['a', 'b'], ['a'])).toBe(0.5);
  });

  it('returns 0 when no skills match', () => {
    expect(skillOverlap(['a', 'b'], ['c'])).toBe(0);
  });

  it('is case insensitive', () => {
    expect(skillOverlap(['First Aid'], ['first aid'])).toBe(1);
    expect(skillOverlap(['FIRST AID'], ['First Aid'])).toBe(1);
  });

  it('returns 0 when volunteer has no skills', () => {
    expect(skillOverlap(['a'], [])).toBe(0);
  });

  it('handles partial overlap with extra volunteer skills', () => {
    expect(skillOverlap(['a', 'b'], ['a', 'c', 'd'])).toBe(0.5);
  });
});

describe('normalizeDistance', () => {
  it('returns 1 for distance 0', () => {
    expect(normalizeDistance(0)).toBe(1);
  });

  it('returns 0.5 for distance at half max', () => {
    expect(normalizeDistance(25000)).toBe(0.5);
  });

  it('returns 0 for distance at max', () => {
    expect(normalizeDistance(50000)).toBe(0);
  });

  it('clamps to 0 for distance beyond max', () => {
    expect(normalizeDistance(100000)).toBe(0);
  });

  it('clamps to 1 for negative distance', () => {
    expect(normalizeDistance(-100)).toBe(1);
  });

  it('uses custom maxMeters parameter', () => {
    expect(normalizeDistance(5000, 10000)).toBe(0.5);
  });

  it('returns correct score for 25% distance', () => {
    expect(normalizeDistance(12500)).toBe(0.75);
  });
});
