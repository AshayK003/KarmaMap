import L from 'leaflet';
import { memo, useEffect, useRef, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Link } from 'react-router-dom';
import type { NearbyGig } from '../types/database';
import { formatDistance } from '../utils/geo';
import { logger } from '../utils/logger';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const gigIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 28px; height: 28px;
    background: linear-gradient(135deg, #059669, #0d9488);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2.5px solid white;
    box-shadow: 0 2px 8px rgba(5,150,105,0.4);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

const youIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative; width:20px; height:20px;">
    <div style="
      position:absolute; inset:0;
      background:#059669; border-radius:50%;
      border: 3px solid white;
      box-shadow: 0 0 0 4px rgba(5,150,105,0.25);
    "></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -14],
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function MapClickPicker({
  enabled,
  onPick,
}: {
  enabled?: boolean;
  onPick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled && onPick) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface MapViewProps {
  lat: number;
  lng: number;
  gigs: NearbyGig[];
  radiusMeters?: number;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  pickMode?: boolean;
  refreshCounter?: number;
}

export const MapView = memo(function MapView({
  lat,
  lng,
  gigs,
  radiusMeters = 10000,
  height = '400px',
  onMapClick,
  pickMode = false,
  refreshCounter = 0,
}: MapViewProps) {
  const [selectedGig, setSelectedGig] = useState<NearbyGig | null>(null);
  const [travelMode, setTravelMode] = useState<'foot' | 'bicycle' | 'car'>('foot');
  const [activeRoute, setActiveRoute] = useState<{
    gigId: string;
    coords: [number, number][];
    distance: number;
    duration: number;
  } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const routeCache = useRef<
    Map<string, { coords: [number, number][]; distance: number; duration: number }>
  >(new Map());

  useEffect(() => {
    setSelectedGig(null);
    setActiveRoute(null);
  }, [lat, lng, gigs, refreshCounter]);

  const osrmProfile: Record<string, string> = {
    foot: 'walking',
    bicycle: 'cycling',
    car: 'driving',
  };

  useEffect(() => {
    if (!selectedGig) {
      setActiveRoute(null);
      return;
    }

    const cacheKey = `${selectedGig.id}-${travelMode}`;
    const cached = routeCache.current.get(cacheKey);
    if (cached) {
      setActiveRoute({ gigId: selectedGig.id, ...cached });
      return;
    }

    setActiveRoute(null);
    let isMounted = true;
    const calculateRoute = async () => {
      setLoadingRoute(true);
      try {
        const profile = osrmProfile[travelMode] ?? 'walking';
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/${profile}/${lng},${lat};${selectedGig.lng},${selectedGig.lat}?overview=full&geometries=geojson`,
        );
        if (!res.ok) throw new Error('OSRM routing request failed');
        const data = await res.json();

        if (!isMounted) return;

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          const routeData = { coords, distance: route.distance, duration: route.duration };
          routeCache.current.set(cacheKey, routeData);
          setActiveRoute({
            gigId: selectedGig.id,
            ...routeData,
          });
        }
      } catch (err) {
        logger.error('Error fetching OSRM route:', err);
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    };

    calculateRoute();

    return () => {
      isMounted = false;
    };
  }, [selectedGig, travelMode, lat, lng]);

  const calculateCo2 = (meters: number) => {
    const co2Grams = (meters / 1000) * 120;
    if (co2Grams >= 1000) {
      return `${(co2Grams / 1000).toFixed(2)} kg`;
    }
    return `${Math.round(co2Grams)} g`;
  };

  return (
    <div
      style={{ height }}
      className="relative overflow-hidden rounded-2xl border border-emerald-100 shadow-sm dark:border-slate-700 dark:shadow-none dark:shadow-slate-900/50"
    >
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 rounded-2xl border border-white/20 bg-white/80 p-1.5 shadow-md backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/80 dark:shadow-none dark:shadow-slate-900/50 select-none">
        {(['foot', 'bicycle', 'car'] as const).map((mode) => {
          const isActive = travelMode === mode;
          const label = mode === 'foot' ? '🚶 Walk' : mode === 'bicycle' ? '🚲 Cycle' : '🚗 Drive';
          return (
            <button
              key={mode}
              type="button"
              aria-label={`Travel mode: ${mode === 'foot' ? 'walking' : mode === 'bicycle' ? 'cycling' : 'driving'}`}
              aria-pressed={isActive}
              onClick={() => setTravelMode(mode)}
              className={`rounded-xl px-3 py-2 text-xs font-black transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? mode === 'foot'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                    : mode === 'bicycle'
                      ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/20'
                      : 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <MapContainer center={[lat, lng]} zoom={13} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <RecenterMap lat={lat} lng={lng} />
        <MapClickPicker enabled={pickMode} onPick={onMapClick} />

        <Circle
          key={`circle-${lat}-${lng}-${radiusMeters}`}
          center={[lat, lng]}
          radius={radiusMeters}
          pathOptions={{
            color: '#059669',
            weight: 1.5,
            fillColor: '#059669',
            fillOpacity: 0.06,
            dashArray: '6 4',
          }}
        />

        {activeRoute && (
          <>
            <Polyline
              positions={activeRoute.coords}
              pathOptions={{
                color:
                  travelMode === 'foot'
                    ? '#10b981'
                    : travelMode === 'bicycle'
                      ? '#06b6d4'
                      : '#6366f1',
                weight: 6,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={activeRoute.coords}
              pathOptions={{
                color:
                  travelMode === 'foot'
                    ? '#059669'
                    : travelMode === 'bicycle'
                      ? '#0891b2'
                      : '#4f46e5',
                weight: 3,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        <Marker position={[lat, lng]} icon={youIcon}>
          <Popup className="leaflet-popup-custom">
            <div className="min-w-[120px] text-center py-1">
              <p className="font-extrabold text-sm text-gray-900 dark:text-slate-100">
                📍 You are here
              </p>
            </div>
          </Popup>
        </Marker>

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          disableClusteringAtZoom={16}
        >
          {gigs.map((gig) => (
            <Marker
              key={gig.id}
              position={[gig.lat, gig.lng]}
              icon={gigIcon}
              eventHandlers={{
                click: () => {
                  const cacheKey = `${gig.id}-${travelMode}`;
                  const cached = routeCache.current.get(cacheKey);
                  if (cached) {
                    setActiveRoute({ gigId: gig.id, ...cached });
                  } else {
                    setActiveRoute(null);
                  }
                  setSelectedGig(gig);
                },
              }}
            >
              <Popup className="leaflet-popup-custom" minWidth={220}>
                <div className="space-y-2">
                  {/* Title + badge */}
                  <div className="flex items-start gap-1.5">
                    {gig.featured_until && new Date(gig.featured_until) > new Date() && (
                      <span className="shrink-0 inline-flex items-center rounded bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 text-[9px] font-black text-amber-800 dark:text-amber-400">
                        ★ FEATURED
                      </span>
                    )}
                    <p className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                      {gig.title}
                    </p>
                  </div>
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 -mt-1">
                    {gig.ngo_name}
                  </p>

                  {/* Info rows */}
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-700 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Distance
                      </span>
                      <span className="text-slate-700 font-extrabold dark:text-slate-200">
                        {formatDistance(gig.distance_meters)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Spots
                      </span>
                      <span className="text-slate-700 font-extrabold dark:text-slate-200">
                        {gig.volunteers_joined}/{gig.volunteers_needed}
                      </span>
                    </div>
                    {gig.duration && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          Duration
                        </span>
                        <span className="text-slate-700 font-extrabold dark:text-slate-200">
                          {gig.duration}h
                        </span>
                      </div>
                    )}

                    {activeRoute && activeRoute.gigId === gig.id ? (
                      <>
                        <div
                          className={`flex items-center justify-between font-black text-[10px] ${travelMode === 'foot' ? 'text-emerald-700 dark:text-emerald-400' : travelMode === 'bicycle' ? 'text-cyan-700 dark:text-cyan-400' : 'text-indigo-700 dark:text-indigo-400'}`}
                        >
                          <span className="flex items-center gap-1">
                            {travelMode === 'foot' ? '🚶' : travelMode === 'bicycle' ? '🚲' : '🚗'}{' '}
                            Travel
                          </span>
                          <span>
                            {formatDistance(activeRoute.distance)} ·{' '}
                            {Math.round(activeRoute.duration / 60)}m
                          </span>
                        </div>
                        <div
                          className={`flex items-center justify-between text-[10px] font-black ${travelMode !== 'car' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          <span>{travelMode !== 'car' ? '🌱 CO₂ Saved' : '🚗 CO₂ Emitted'}</span>
                          <span>{calculateCo2(activeRoute.distance)}</span>
                        </div>
                      </>
                    ) : loadingRoute ? (
                      <div className="text-[10px] text-emerald-600 animate-pulse font-extrabold">
                        Calculating route…
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">
                        Click marker for route
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/gigs/${gig.id}`}
                    className="block w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 text-center text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
                    style={{ color: 'white', textDecoration: 'none' }}
                  >
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
});
