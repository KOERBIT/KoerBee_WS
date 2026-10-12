// Auswählbare Hero-Animationen (Startseite + Shop). Es ist immer genau eine live,
// gespeichert sprachunabhängig unter CMS-Key `hero.animation` (locale "de").
// Neue Animation = Eintrag hier + Darstellung in components/landing/HeroAnimation.tsx

export type HeroAnimationKind = 'none' | 'mascot' | 'flying-bees'

export interface HeroAnimationOption {
  id: string
  kind: HeroAnimationKind
  label: string
  description: string
  /** GLB-Modell (nur Maskottchen) */
  model?: string
}

export const HERO_ANIMATIONS: HeroAnimationOption[] = [
  { id: 'none', kind: 'none', label: 'Keine Animation', description: 'Nur Hintergrund-Video' },
  { id: 'mascot-v2', kind: 'mascot', model: '/biene.glb', label: 'Chibi-Königin (V2)', description: '3D-Maskottchen' },
  { id: 'mascot-v1', kind: 'mascot', model: '/biene-krone.glb', label: 'Chibi-Königin mit Krone (V1)', description: '3D-Maskottchen' },
  { id: 'mascot-v3', kind: 'mascot', model: '/biene-realistisch.glb', label: 'Realistische Königin (V3)', description: '3D-Maskottchen mit Jahresfarbe' },
  { id: 'flying-bees', kind: 'flying-bees', label: 'Fliegende Bienen (3D)', description: 'Sportliche & müde Biene, Klick auf die Müde spielt den Sound' },
]

export const DEFAULT_HERO_ANIMATION = 'mascot-v2'

/** Sprachunabhängige Medien-Keys (immer unter locale "de" gespeichert) */
export const HERO_MEDIA_KEYS = ['hero.video', 'hero.animation', 'hero.animation.sound', 'mascot.modell'] as const

/**
 * Live-Animation aus den CMS-Werten bestimmen. Ältere Installationen haben nur
 * `mascot.modell` gespeichert – daraus wird das passende Maskottchen abgeleitet.
 */
export function resolveHeroAnimation(cms: Record<string, string | undefined>): HeroAnimationOption {
  const byId = HERO_ANIMATIONS.find(a => a.id === cms['hero.animation'])
  if (byId) return byId
  const byModel = HERO_ANIMATIONS.find(a => a.kind === 'mascot' && a.model === cms['mascot.modell'])
  return byModel ?? HERO_ANIMATIONS.find(a => a.id === DEFAULT_HERO_ANIMATION)!
}
