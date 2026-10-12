'use client'

import dynamic from 'next/dynamic'
import type { Locale } from '@/lib/shop/i18n'
import type { HeroAnimationOption } from '@/lib/hero-media'

// three.js nur laden, wenn die jeweilige Animation auch live ist
const BeeMascot3D = dynamic(() => import('@/components/mascot/BeeMascot3D'), { ssr: false })
const FlyingBees = dynamic(() => import('@/components/landing/FlyingBees'), { ssr: false })

/** Zeigt die in der Verwaltung live geschaltete Hero-Animation (siehe lib/hero-media.ts). */
export default function HeroAnimation({ animation, locale, soundUrl }: {
  animation: HeroAnimationOption
  locale: Locale
  soundUrl?: string
}) {
  switch (animation.kind) {
    case 'mascot':
      return <BeeMascot3D modell={animation.model} />
    case 'flying-bees':
      return <FlyingBees locale={locale} soundUrl={soundUrl} />
    default:
      return null
  }
}
