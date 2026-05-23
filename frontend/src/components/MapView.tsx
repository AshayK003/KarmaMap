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
    <div style={{ height }} className="overflow-hidden rounded-xl border border-emerald-200">
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
        <Circle
          center={[lat, lng]}
          radius={radiusMeters}
          pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 0.08 }}
        />
        <Marker position={[lat, lng]}>
          <Popup>You are here</Popup>
        </Marker>
        {gigs.map((gig) => (
          <Marker key={gig.id} position={[gig.lat, gig.lng]}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold">{gig.title}</p>
                <p className="text-xs text-gray-500">{gig.ngo_name}</p>
                <p className="text-xs">{formatDistance(gig.distance_meters)} away</p>
                <Link
                  to={`/gigs/${gig.id}`}
                  className="mt-2 block text-sm text-emerald-600 hover:underline"
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
