import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CENTER } from '../utils/geo';

interface GeoState {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
  /** True when coordinates come from the local cache, not a live GPS fix. */
  stale: boolean;
}

const LS_KEY = 'karmamap_last_position';
/** Cached positions older than this are ignored entirely. */
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CachedPosition {
  coords: [number, number];
  savedAt: number;
}

function loadCachedPosition(): CachedPosition | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const coords: [number, number] | null =
      Array.isArray(parsed) && typeof parsed[0] === 'number' ? [parsed[0], parsed[1]] : null;
    if (coords) return { coords, savedAt: Date.now() };
    // New format with timestamp.
    if (parsed?.coords && typeof parsed.savedAt === 'number') {
      if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;
      return { coords: parsed.coords as [number, number], savedAt: parsed.savedAt };
    }
    return null;
  } catch {
    return null;
  }
}

function savePosition(lat: number, lng: number) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ coords: [lat, lng], savedAt: Date.now() }));
  } catch {}
}

export function useGeolocation() {
  // Read the cache once per hook instance, not on every render.
  const initial = useMemo(() => loadCachedPosition(), []);
  const [state, setState] = useState<GeoState>({
    lat: initial?.coords[0] ?? DEFAULT_CENTER[0],
    lng: initial?.coords[1] ?? DEFAULT_CENTER[1],
    loading: true,
    error: null,
    stale: initial !== null,
  });

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        loading: false,
        error: 'Geolocation not supported',
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true }));

    // Two-phase: try high accuracy (GPS) with short timeout,
    // fallback to low accuracy (Wi-Fi/cell) with longer timeout
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        savePosition(latitude, longitude);
        setState({ lat: latitude, lng: longitude, loading: false, error: null, stale: false });
      },
      () => {
        // Phase 2: fallback to low accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            savePosition(latitude, longitude);
            setState({ lat: latitude, lng: longitude, loading: false, error: null, stale: false });
          },
          (err) => {
            const cached = loadCachedPosition();
            setState({
              lat: cached?.coords[0] ?? DEFAULT_CENTER[0],
              lng: cached?.coords[1] ?? DEFAULT_CENTER[1],
              loading: false,
              error: err.message,
              stale: cached !== null,
            });
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
