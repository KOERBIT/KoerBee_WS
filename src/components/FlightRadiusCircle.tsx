'use client'

import { Circle, Popup } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'

interface FlightRadiusCircleProps {
  center: LatLngExpression
  radiusKm: number
  name: string
}

export function FlightRadiusCircle({ center, radiusKm, name }: FlightRadiusCircleProps) {
  // Convert km to meters
  const radiusMeters = radiusKm * 1000

  return (
    <Circle
      center={center}
      radius={radiusMeters}
      pathOptions={{
        color: 'rgb(245, 158, 11)', // amber-500
        weight: 2,
        opacity: 0.6,
        fillColor: 'rgb(251, 191, 36)', // amber-400
        fillOpacity: 0.1,
      }}
    >
      <Popup>{`${name}: ${radiusKm}km Flugradius`}</Popup>
    </Circle>
  )
}
