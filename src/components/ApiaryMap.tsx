// src/components/ApiaryMap.tsx
'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { FlightRadiusCircle } from '@/components/FlightRadiusCircle'

// Leaflet default-Icon fix (Next.js bundler verschluckt die PNG-Assets)
const HIVE_ICON = L.divIcon({
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🍯</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

interface ApiaryMapProps {
  lat: number
  lng: number
  name: string
  flightRadius?: number | null
}

export function ApiaryMap({ lat, lng, name, flightRadius }: ApiaryMapProps) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm mb-6" style={{ height: 200 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={HIVE_ICON}>
          <Popup>{name}</Popup>
        </Marker>
        {flightRadius && (
          <FlightRadiusCircle
            key={`circle-${name}`}
            center={[lat, lng]}
            radiusKm={flightRadius}
            name={name}
          />
        )}
      </MapContainer>
    </div>
  )
}
