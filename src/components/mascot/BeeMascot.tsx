'use client'

import dynamic from 'next/dynamic'

const BeeMascot3D = dynamic(() => import('./BeeMascot3D'), { ssr: false })

export interface BeeMascotProps {
  /** Path to GLB model in /public, e.g. "/biene.glb" */
  modell?: string
}

export default function BeeMascot({ modell }: BeeMascotProps) {
  return <BeeMascot3D modell={modell} />
}
