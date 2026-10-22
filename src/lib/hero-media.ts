// Auswählbare Hero-Animationen (Startseite + Shop). Es ist immer genau eine live,
// gespeichert sprachunabhängig unter CMS-Key `hero.animation` (locale "de").
// Neue Animation = Eintrag hier + Darstellung in components/landing/HeroAnimation.tsx

export type HeroAnimationKind = 'none' | 'mascot' | 'flying-bees' | 'duo'

export interface HeroAnimationOption {
  id: string
  kind: HeroAnimationKind
  label: string
  description: string
  /** GLB-Modell (nur Maskottchen) */
  model?: string
  /** Zwei GLB-Modelle (nur Duo) — [Anführer, Begleiter] */
  models?: [string, string]
}

export const HERO_ANIMATIONS: HeroAnimationOption[] = [
  { id: 'none', kind: 'none', label: 'Keine Animation', description: 'Nur Hintergrund-Video' },
  { id: 'random-daily', kind: 'none', label: 'Täglich wechselnd', description: 'Jeden Tag automatisch eine andere Animation (zufällig)' },
  { id: 'mascot-v2', kind: 'mascot', model: '/biene.glb', label: 'Chibi-Königin (V2)', description: '3D-Maskottchen' },
  { id: 'mascot-v1', kind: 'mascot', model: '/biene-krone.glb', label: 'Chibi-Königin mit Krone (V1)', description: '3D-Maskottchen' },
  { id: 'mascot-v3', kind: 'mascot', model: '/biene-realistisch.glb', label: 'Realistische Königin (V3)', description: '3D-Maskottchen mit Jahresfarbe' },
  { id: 'flying-bees', kind: 'flying-bees', label: 'Fliegende Bienen (3D)', description: 'Sportliche & müde Biene, Klick auf die Müde spielt den Sound' },
  { id: 'maja', kind: 'mascot', model: '/insekten/maja.glb', label: 'Maja 1', description: 'Einzelne Biene' },
  { id: 'insekt2', kind: 'mascot', model: '/insekten/insekt2.glb', label: 'Maja 2', description: 'Einzelne Biene' },
  { id: 'willi', kind: 'mascot', model: '/insekten/willi.glb', label: 'Willi 1', description: 'Einzelne Biene mit Augen & Mund' },
  { id: 'duo-maja-insekt2', kind: 'duo', models: ['/insekten/maja.glb', '/insekten/insekt2.glb'], label: 'Maja 1 + Maja 2', description: 'Duo: fliegen zusammen' },
  { id: 'duo-maja-willi', kind: 'duo', models: ['/insekten/maja.glb', '/insekten/willi.glb'], label: 'Maja 1 + Willi 1', description: 'Duo: fliegen zusammen' },
]

export const DEFAULT_HERO_ANIMATION = 'mascot-v2'

/** Sprachunabhängige Medien-Keys (immer unter locale "de" gespeichert) */
export const HERO_MEDIA_KEYS = ['hero.video', 'hero.animation', 'hero.animation.sound', 'mascot.modell'] as const

/** Animationen die für den Zufallsmodus in Frage kommen (alles außer 'none' und 'random-daily'). */
const RANDOM_POOL = HERO_ANIMATIONS.filter(a => a.id !== 'none' && a.id !== 'random-daily')

/**
 * Deterministisch eine Animation für den heutigen Tag auswählen.
 * Alle Besucher sehen am selben Tag dieselbe Animation.
 */
function dailyRandomAnimation(): HeroAnimationOption {
  const today = new Date()
  // Einfacher Tages-Hash: Jahr * 366 + Tag-des-Jahres
  const start = new Date(today.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((today.getTime() - start.getTime()) / 86_400_000)
  const index = (today.getFullYear() * 366 + dayOfYear) % RANDOM_POOL.length
  return RANDOM_POOL[index]
}

/**
 * Live-Animation aus den CMS-Werten bestimmen. Ältere Installationen haben nur
 * `mascot.modell` gespeichert – daraus wird das passende Maskottchen abgeleitet.
 */
export function resolveHeroAnimation(cms: Record<string, string | undefined>): HeroAnimationOption {
  if (cms['hero.animation'] === 'random-daily') return dailyRandomAnimation()
  const byId = HERO_ANIMATIONS.find(a => a.id === cms['hero.animation'])
  if (byId) return byId
  const byModel = HERO_ANIMATIONS.find(a => a.kind === 'mascot' && a.model === cms['mascot.modell'])
  return byModel ?? HERO_ANIMATIONS.find(a => a.id === DEFAULT_HERO_ANIMATION)!
}
