import { memo, useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { NearbyGig } from '../types/database';
import { formatDistance } from '../utils/geo';
import { Link } from 'react-router-dom';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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
}

export const MapView = memo(function MapView({
  lat,
  lng,
  gigs,
  radiusMeters = 10000,
  height = '400px',
  onMapClick,
  pickMode = false,
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
  const routeCache = useRef<Map<string, { coords: [number, number][]; distance: number; duration: number }>>(new Map());

  useEffect(() => {
    setSelectedGig(null);
    setActiveRoute(null);
  }, [lat, lng, gigs]);

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

    let isMounted = true;
    const calculateRoute = async () => {
      setLoadingRoute(true);
      try {
        const profile = osrmProfile[travelMode] ?? 'walking';
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/${profile}/${lng},${lat};${selectedGig.lng},${selectedGig.lat}?overview=full&geometries=geojson`
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
        console.error('Error fetching OSRM route:', err);
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

      <MapContainer
        center={[lat, lng]}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom
      >
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
                color: travelMode === 'foot' ? '#10b981' : travelMode === 'bicycle' ? '#06b6d4' : '#6366f1',
                weight: 6,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={activeRoute.coords}
              pathOptions={{
                color: travelMode === 'foot' ? '#059669' : travelMode === 'bicycle' ? '#0891b2' : '#4f46e5',
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
              <p className="font-extrabold text-sm text-gray-900 dark:text-slate-100">📍 You are here</p>
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
                click: () => setSelectedGig(gig),
              }}
            >
              <Popup className="leaflet-popup-custom" minWidth={210}>
                <div className="space-y-1.5 py-1">
                  <p className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-snug flex items-center gap-1.5">
                    {gig.featured_until && new Date(gig.featured_until) > new Date() && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">★ FEATURED</span>
                    )}
                    {gig.title}
                  </p>
                  <p className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400">{gig.ngo_name}</p>

                  <div className="flex flex-col text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 gap-1 border-t border-slate-100 dark:border-slate-700 pt-1.5 mt-1.5">
                    <div className="flex items-center justify-between">
                      <span>📍 Straight line:</span>
                      <span className="text-slate-700 font-extrabold dark:text-slate-200">{formatDistance(gig.distance_meters)}</span>
                    </div>

                    {activeRoute && activeRoute.gigId === gig.id ? (
                      <>
                        <div className={`flex items-center justify-between font-black ${
                          travelMode === 'foot' ? 'text-emerald-700 dark:text-emerald-400' : travelMode === 'bicycle' ? 'text-cyan-700 dark:text-cyan-400' : 'text-indigo-700 dark:text-indigo-400'
                        }`}>
                          <span>{travelMode === 'foot' ? '🚶 Walking road:' : travelMode === 'bicycle' ? '🚲 Cycling road:' : '🚗 Driving road:'}</span>
                          <span>{formatDistance(activeRoute.distance)}</span>
                        </div>
                        <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 font-black">
                          <span>⏱️ Travel time:</span>
                          <span>{Math.round(activeRoute.duration / 60)} mins</span>
                        </div>
                        
                        {travelMode !== 'car' ? (
                          <div className="flex items-center justify-between text-emerald-600 font-black bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50 mt-1 shadow-2xs dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-slate-700 dark:shadow-none dark:shadow-slate-900/50">
                            <span>🌱 CO2 Saved:</span>
                            <span>{calculateCo2(activeRoute.distance)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-500 font-black bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/50 mt-1 dark:text-slate-400 dark:bg-slate-800/50 dark:border-slate-700/50">
                            <span>🚗 CO2 Emitted:</span>
                            <span>{calculateCo2(activeRoute.distance)}</span>
                          </div>
                        )}
                      </>
                    ) : loadingRoute ? (
                      <div className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 animate-pulse font-extrabold py-0.5">
                        Calculating road route...
                      </div>
                    ) : (
                      <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium italic py-0.5">
                        Click marker to calculate road route
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-1.5 mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                      <span>👥 Joined spots:</span>
                      <span className="text-slate-700 font-extrabold dark:text-slate-200">{gig.volunteers_joined}/{gig.volunteers_needed}</span>
                    </div>
                  </div>

                  <Link
                    to={`/gigs/${gig.id}`}
                    className="mt-2.5 block w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-center text-xs sm:text-sm font-black text-white shadow-sm dark:shadow-none dark:shadow-slate-900/50 transition-all active:scale-95 cursor-pointer"
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
