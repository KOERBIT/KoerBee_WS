// src/components/ApiaryMapPicker.tsx
'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const PIN_ICON = L.divIcon({
  html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))">📍</div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface ApiaryMapPickerProps {
  lat?: number
  lng?: number
  onChange: (lat: number, lng: number) => void
}

export function ApiaryMapPicker({ lat, lng, onChange }: ApiaryMapPickerProps) {
  const hasPosition = lat != null && lng != null
  const center: [number, number] = hasPosition ? [lat!, lng!] : [51.1657, 10.4515]
  const zoom = hasPosition ? 13 : 6

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-200" style={{ height: 220 }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={onChange} />
        {hasPosition && (
          <Marker
            position={[lat!, lng!]}
            icon={PIN_ICON}
            draggable
            eventHandlers={{
              dragend(e) {
                const pos = (e.target as L.Marker).getLatLng()
                onChange(pos.lat, pos.lng)
              },
            }}
          />
        )}
      </MapContainer>
      <p className="text-[11px] text-zinc-400 text-center py-1 bg-white border-t border-zinc-100">
        Karte antippen oder Pin ziehen um Standort zu setzen
      </p>
    </div>
  )
}
