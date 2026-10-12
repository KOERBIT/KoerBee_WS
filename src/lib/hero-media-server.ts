import { prisma } from '@/lib/prisma'
import { resolveHeroAnimation, HERO_MEDIA_KEYS } from '@/lib/hero-media'

/** Hero-Medien (Video, Animation, Sound) – sprachunabhängig immer aus locale "de". */
export async function getHeroMedia() {
  const cms: Record<string, string> = {}
  try {
    const entries = await prisma.cmsContent.findMany({
      where: { locale: 'de', key: { in: [...HERO_MEDIA_KEYS] } },
      select: { key: true, value: true },
    })
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
