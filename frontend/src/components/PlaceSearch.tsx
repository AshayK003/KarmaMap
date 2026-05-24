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

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const places = await searchPlaces(query, controller.signal);
        setResults(places);
        setOpen(places.length > 0);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setOpen(false);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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
      <label className="text-xs font-medium text-gray-600 dark:text-slate-300">Search location</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        autoComplete="off"
      />
      {loading && (
        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Searching…</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {open && results.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:shadow-none dark:shadow-slate-900/50"
          role="listbox"
        >
          {results.map((place) => (
            <li key={`${place.lat}-${place.lng}-${place.label}`}>
              <button
                type="button"
                role="option"
                onClick={() => handleSelect(place)}
                className="w-full px-3 py-3 text-left text-sm text-gray-800 hover:bg-emerald-50 border-b border-slate-50 last:border-0 dark:text-slate-100 dark:hover:bg-emerald-900/30 dark:border-slate-700"
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[10px] sm:text-xs text-gray-400 dark:text-slate-500">
        Powered by OpenStreetMap (Photon) · type 3+ letters
      </p>
    </div>
  );
}
