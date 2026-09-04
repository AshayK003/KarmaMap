import { describe, expect, it } from 'vitest';
import {
  createGigSchema,
  featureGigSchema,
} from '../../controllers/gigController.js';
import { completeGigSchema } from '../../controllers/participationController.js';

describe('createGigSchema', () => {
  const futureIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const validInput = {
    title: 'Cleanup Drive',
    description: 'Join us for a monthly cleanup of the park',
    lat: 28.6139,
    lng: 77.209,
    required_skills: ['cleaning', 'organizing'],
    volunteers_needed: 5,
    gig_date: futureIso,
    location_label: 'Central Park',
  };

  it('accepts valid input', () => {
    const result = createGigSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts input without optional location_label', () => {
    const { location_label, ...rest } = validInput;
    const result = createGigSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 3 characters', () => {
    const result = createGigSchema.safeParse({ ...validInput, title: 'AB' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('title');
    }
  });

  it('rejects description shorter than 10 characters', () => {
    const result = createGigSchema.safeParse({ ...validInput, description: 'Short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('description');
    }
  });

  it('rejects non-number lat', () => {
    const result = createGigSchema.safeParse({ ...validInput, lat: 'not-a-number' });
    expect(result.success).toBe(false);
  });

  it('rejects volunteers_needed less than 1', () => {
    const result = createGigSchema.safeParse({ ...validInput, volunteers_needed: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer volunteers_needed', () => {
    const result = createGigSchema.safeParse({ ...validInput, volunteers_needed: 1.5 });
    expect(result.success).toBe(false);
  });

  it('defaults required_skills to empty array', () => {
    const { required_skills, ...rest } = validInput;
    const result = createGigSchema.parse(rest);
    expect(result.required_skills).toEqual([]);
  });

  it('defaults volunteers_needed to 1', () => {
    const { volunteers_needed, ...rest } = validInput;
    const result = createGigSchema.parse(rest);
    expect(result.volunteers_needed).toBe(1);
  });

  it('rejects empty gig_date', () => {
    const result = createGigSchema.safeParse({ ...validInput, gig_date: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a gig_date in the past', () => {
    const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = createGigSchema.safeParse({ ...validInput, gig_date: pastIso });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('gig_date');
    }
  });

  it('rejects an unparseable gig_date', () => {
    const result = createGigSchema.safeParse({ ...validInput, gig_date: 'not-a-date' });
    expect(result.success).toBe(false);
  });
});

describe('featureGigSchema', () => {
  it('accepts positive hours', () => {
    const result = featureGigSchema.safeParse({ hours: 24 });
    expect(result.success).toBe(true);
  });

  it('rejects zero hours', () => {
    const result = featureGigSchema.safeParse({ hours: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative hours', () => {
    const result = featureGigSchema.safeParse({ hours: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric hours', () => {
    const result = featureGigSchema.safeParse({ hours: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('completeGigSchema', () => {
  const validInput = { hours: 3 };

  it('accepts valid input', () => {
    const result = completeGigSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts coerce string number for hours', () => {
    const result = completeGigSchema.safeParse({ hours: '4' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hours).toBe(4);
    }
  });

  it('rejects hours below 0.5', () => {
    const result = completeGigSchema.safeParse({ hours: 0.25 });
    expect(result.success).toBe(false);
  });

  it('rejects hours above 24', () => {
    const result = completeGigSchema.safeParse({ hours: 25 });
    expect(result.success).toBe(false);
  });

  it('accepts optional photo URLs', () => {
    const result = completeGigSchema.safeParse({
      hours: 2,
      before_photo_url: 'https://example.com/before.jpg',
      after_photo_url: 'https://example.com/after.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty before_photo_url', () => {
    const result = completeGigSchema.safeParse({ hours: 2, before_photo_url: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing hours', () => {
    const result = completeGigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
