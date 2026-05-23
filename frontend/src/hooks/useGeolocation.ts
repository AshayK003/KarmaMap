import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_CENTER } from '../utils/geo';

interface GeoState {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: DEFAULT_CENTER[0],
    lng: DEFAULT_CENTER[1],
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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({
          lat: DEFAULT_CENTER[0],
          lng: DEFAULT_CENTER[1],
          loading: false,
          error: err.message,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
