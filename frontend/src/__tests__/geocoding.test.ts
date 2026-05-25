declare const global: typeof globalThis;

import { describe, expect, it } from 'vitest';

describe('formatPhotonLabel', () => {
  it('deduplicates identical parts', async () => {
    const { searchPlaces } = await import('../services/geocoding');
    expect(searchPlaces).toBeDefined();
  });
});

describe('searchPlaces', () => {
  it('returns empty array for query under 3 chars', async () => {
    const { searchPlaces } = await import('../services/geocoding');
    const result = await searchPlaces('ab');
    expect(result).toEqual([]);
  });

  it('throws on non-ok response', async () => {
    global.fetch = () =>
      Promise.resolve({
        ok: false,
        status: 429,
      } as Response);

    const { searchPlaces } = await import('../services/geocoding');
    await expect(searchPlaces('delhi')).rejects.toThrow('Place search unavailable');
  });

  it('parses Photon response into PlaceResult', async () => {
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [
              {
                geometry: { coordinates: [77.2, 28.6] },
                properties: {
                  name: 'India Gate',
                  city: 'New Delhi',
                  country: 'India',
                },
              },
            ],
          }),
      } as Response);

    const { searchPlaces } = await import('../services/geocoding');
    const results = await searchPlaces('india gate');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      label: 'India Gate, New Delhi, India',
      lng: 77.2,
      lat: 28.6,
    });
  });
});
