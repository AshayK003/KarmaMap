import { PRESET_LUCKNOW_RDSO } from '../hooks/useLocationPicker';
import { PlaceSearch } from './PlaceSearch';

interface LocationPickerProps {
  lat: number;
  lng: number;
  source: string;
  placeLabel?: string | null;
  geoError?: string | null;
  onUseGps: () => void;
  onPreset: (preset: { lat: number; lng: number }) => void;
  onManualApply: (lat: number, lng: number) => void;
  onSearchSelect: (lat: number, lng: number, label: string) => void;
  mapHint?: string;
}

export function LocationPicker({
  lat,
  lng,
  source,
  placeLabel,
  geoError,
  onUseGps,
  onPreset,
  onManualApply,
  onSearchSelect,
  mapHint = 'Tap the map below to set location',
}: LocationPickerProps) {
  const handleManual = (form: FormData) => {
    const latVal = Number(form.get('manual_lat'));
    const lngVal = Number(form.get('manual_lng'));
    if (!Number.isFinite(latVal) || !Number.isFinite(lngVal)) return;
    if (latVal < -90 || latVal > 90 || lngVal < -180 || lngVal > 180) return;
    onManualApply(latVal, lngVal);
  };

  return (
    <div className="p-4 border rounded-lg bg-white/30 backdrop-blur-lg border-white/20 shadow-lg backdrop-filter">
      <h2 className="text-lg font-bold mb-2">Location Picker</h2>
      {placeLabel && source === 'search' ? (
        <p className="mt-1 text-xs text-gray-700">{placeLabel}</p>
      ) : null}
      <p className="mt-1 text-xs text-gray-500">
        {lat.toFixed(5)}, {lng.toFixed(5)}{' '}
        <span className="text-emerald-600">({source})</span>
      </p>
      {geoError && source === 'gps' && (
        <p className="mt-1 text-xs text-amber-600">GPS: {geoError}</p>
      )}

      <div className="mt-3">
        <PlaceSearch
          onSelect={(place) => onSearchSelect(place.lat, place.lng, place.label)}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUseGps}
          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
        >
          Use GPS
        </button>
        <button
          type="button"
          onClick={() => onPreset(PRESET_LUCKNOW_RDSO)}
          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
        >
          {PRESET_LUCKNOW_RDSO.label}
        </button>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-600">
          Manual coordinates
        </summary>
        <form
          className="mt-2 grid grid-cols-2 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleManual(new FormData(e.currentTarget));
          }}
        >
          <div>
            <label className="text-xs text-gray-500">Latitude</label>
            <input
              name="manual_lat"
              type="number"
              step="any"
              defaultValue={lat.toFixed(5)}
              key={`lat-${lat}`}
              className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Longitude</label>
            <input
              name="manual_lng"
              type="number"
              step="any"
              defaultValue={lng.toFixed(5)}
              key={`lng-${lng}`}
              className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="col-span-2 rounded-lg bg-emerald-100 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-200"
          >
            Apply coordinates
          </button>
        </form>
      </details>

      <p className="mt-2 text-xs text-gray-400">{mapHint}</p>
    </div>
  );
}
