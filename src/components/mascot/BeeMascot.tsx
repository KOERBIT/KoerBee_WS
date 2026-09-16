'use client'

import dynamic from 'next/dynamic'

const BeeMascot3D = dynamic(() => import('./BeeMascot3D'), { ssr: false })

export default function BeeMascot() {
  return <BeeMascot3D />
}
