// src/components/ApiaryMapClient.tsx
'use client'

import dynamic from 'next/dynamic'

const ApiaryMap = dynamic(
  () => import('@/components/ApiaryMap').then(m => m.ApiaryMap),
  { ssr: false, loading: () => <div className="h-[200px] bg-zinc-100 rounded-2xl mb-6 animate-pulse" /> }
)

interface ApiaryMapClientProps {
  lat: number
  lng: number
  name: string
  flightRadius?: number | null
}

export function ApiaryMapClient({ lat, lng, name, flightRadius }: ApiaryMapClientProps) {
  return <ApiaryMap lat={lat} lng={lng} name={name} flightRadius={flightRadius} />
}
