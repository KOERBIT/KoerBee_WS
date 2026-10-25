import { getCachedHeroEntries } from '@/lib/cms-cache'
import { resolveHeroAnimation } from '@/lib/hero-media'

/** Hero-Medien (Video, Animation, Sound) – sprachunabhängig immer aus locale "de". */
export async function getHeroMedia() {
  const cms: Record<string, string> = {}
  try {
    const entries = await getCachedHeroEntries()
    for (const e of entries) cms[e.key] = e.value
  } catch { /* DB unreachable → Standardwerte */ }
  return heroMediaFromCms(cms)
}

export function heroMediaFromCms(cms: Record<string, string | undefined>) {
  return {
    videoUrl: cms['hero.video'] || undefined,
    animation: resolveHeroAnimation(cms),
    soundUrl: cms['hero.animation.sound'] || undefined,
  }
}
