import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
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

// Custom green pin icon for gig markers
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

// Custom "you are here" pulse icon
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

export function MapView({
  lat,
  lng,
  gigs,
  radiusMeters = 10000,
  height = '400px',
  onMapClick,
  pickMode = false,
}: MapViewProps) {
  return (
    <div
      style={{ height }}
      className="overflow-hidden rounded-2xl border border-emerald-100 shadow-sm"
    >
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap lat={lat} lng={lng} />
        <MapClickPicker enabled={pickMode} onPick={onMapClick} />

        {/* Search radius circle */}
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

        {/* "You are here" marker */}
        <Marker position={[lat, lng]} icon={youIcon}>
          <Popup className="leaflet-popup-custom">
            <div className="min-w-[120px] text-center py-1">
              <p className="font-extrabold text-sm text-gray-900">📍 You are here</p>
            </div>
          </Popup>
        </Marker>

        {/* Gig markers */}
        {gigs.map((gig) => (
          <Marker key={gig.id} position={[gig.lat, gig.lng]} icon={gigIcon}>
            <Popup className="leaflet-popup-custom" minWidth={200}>
              <div className="min-w-[200px] space-y-1.5 py-1">
                <p className="font-extrabold text-sm text-gray-900 leading-snug">{gig.title}</p>
                <p className="text-xs font-bold text-emerald-700">{gig.ngo_name}</p>
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                  <span>📍 {formatDistance(gig.distance_meters)} away</span>
                  <span>{gig.volunteers_joined}/{gig.volunteers_needed} spots</span>
                </div>
                <Link
                  to={`/gigs/${gig.id}`}
                  className="mt-2 block w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 py-1.5 text-center text-xs font-extrabold text-white transition-colors"
                >
                  View gig →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
