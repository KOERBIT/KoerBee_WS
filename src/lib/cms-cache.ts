import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { HERO_MEDIA_KEYS } from '@/lib/hero-media'

/** Cache-Tag für alle öffentlich gelesenen CMS-Daten (Texte, Blog). */
export const CMS_CACHE_TAG = 'cms'

// Sicherheitsnetz: auch ohne Invalidierung (z. B. direkte DB-Änderung) nach 5 Minuten neu laden.
const options = { tags: [CMS_CACHE_TAG], revalidate: 300 }

/** CMS-Einträge für die angegebenen Sprachen (Cache-Schlüssel enthält die Argumente). */
export const getCachedCmsEntries = unstable_cache(
  async (locales: string[]) =>
    prisma.cmsContent.findMany({
      where: { locale: { in: locales } },
      select: { key: true, value: true, locale: true },
    }),
  ['cms-entries'],
  options,
)

/** Hero-Medien-Einträge (immer locale "de"). */
export const getCachedHeroEntries = unstable_cache(
  async () =>
    prisma.cmsContent.findMany({
      where: { locale: 'de', key: { in: [...HERO_MEDIA_KEYS] } },
      select: { key: true, value: true },
    }),
  ['cms-hero-entries'],
  options,
)

/** Neueste veröffentlichte Beiträge für die Startseite. publishedAt kommt als ISO-String aus dem Cache. */
export const getCachedLandingPosts = unstable_cache(
  async () =>
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, category: true, publishedAt: true },
    }),
  ['cms-landing-posts'],
  options,
)
