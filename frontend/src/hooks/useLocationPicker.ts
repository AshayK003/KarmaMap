import { useCallback, useState } from 'react';
import { useGeolocation } from './useGeolocation';

/** Lucknow RDSO area — handy preset when GPS differs between devices */
export const PRESET_LUCKNOW_RDSO = { lat: 26.8193, lng: 80.8853, label: 'Lucknow (RDSO)' };

export function useLocationPicker() {
  const geo = useGeolocation();
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [source, setSource] = useState<'gps' | 'manual' | 'map' | 'preset' | 'search'>('gps');
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);

  const lat = picked?.lat ?? geo.lat;
  const lng = picked?.lng ?? geo.lng;

  const setLocation = useCallback(
    (newLat: number, newLng: number, src: typeof source, label?: string) => {
      setPicked({ lat: newLat, lng: newLng });
      setSource(src);
      setPlaceLabel(label ?? null);
    },
    [],
  );

  const useGps = useCallback(() => {
    setPicked(null);
    setSource('gps');
    geo.refresh();
  }, [geo]);

  const usePreset = useCallback(
    (preset: { lat: number; lng: number }) => {
      setLocation(preset.lat, preset.lng, 'preset');
    },
    [setLocation],
  );

  return {
    lat,
    lng,
    source,
    geoLoading: geo.loading,
    geoError: geo.error,
    setLocation,
    useGps,
    usePreset,
    placeLabel,
    setFromMap: (newLat: number, newLng: number) => setLocation(newLat, newLng, 'map'),
    setFromSearch: (newLat: number, newLng: number, label: string) =>
      setLocation(newLat, newLng, 'search', label),
  };
}
