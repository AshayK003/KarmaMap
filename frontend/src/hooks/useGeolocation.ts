import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CENTER } from '../utils/geo';

interface GeoState {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
}

const LS_KEY = 'karmamap_last_position';

function loadCachedPosition(): [number, number] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const [lat, lng] = JSON.parse(raw);
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
  } catch {}
  return null;
}

function savePosition(lat: number, lng: number) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([lat, lng]));
  } catch {}
}

export function useGeolocation() {
  const cached = loadCachedPosition();
  const [state, setState] = useState<GeoState>({
    lat: cached?.[0] ?? DEFAULT_CENTER[0],
    lng: cached?.[1] ?? DEFAULT_CENTER[1],
    loading: true,
    error: null,
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
        setState({ lat: latitude, lng: longitude, loading: false, error: null });
      },
      () => {
        // Phase 2: fallback to low accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            savePosition(latitude, longitude);
            setState({ lat: latitude, lng: longitude, loading: false, error: null });
          },
          (err) => {
            const cached = loadCachedPosition();
            setState({
              lat: cached?.[0] ?? DEFAULT_CENTER[0],
              lng: cached?.[1] ?? DEFAULT_CENTER[1],
              loading: false,
              error: err.message,
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
