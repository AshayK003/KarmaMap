import { useEffect, useRef, useState } from 'react';
import { searchPlaces, type PlaceResult } from '../services/geocoding';

interface PlaceSearchProps {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
}

export function PlaceSearch({
  onSelect,
  placeholder = 'Search city, area, or address…',
}: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const places = await searchPlaces(query);
        setResults(places);
        setOpen(places.length > 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (place: PlaceResult) => {
    setQuery(place.label);
    setOpen(false);
    onSelect(place);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-xs font-medium text-gray-600">Search location</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        autoComplete="off"
      />
      {loading && (
        <p className="mt-1 text-xs text-gray-400">Searching…</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {open && results.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {results.map((place) => (
            <li key={`${place.lat}-${place.lng}-${place.label}`}>
              <button
                type="button"
                role="option"
                onClick={() => handleSelect(place)}
                className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-emerald-50"
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-gray-400">
        Powered by OpenStreetMap (Photon) · type 3+ letters
      </p>
    </div>
  );
}
