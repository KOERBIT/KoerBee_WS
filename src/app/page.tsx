import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import type { Locale } from '@/lib/shop/i18n'
import LandingContent from '@/components/landing/LandingContent'
import HoneyDripBackground from '@/components/shop/HoneyDripBackground'
import { HERO_MEDIA_KEYS, HERO_ANIMATIONS, resolveHeroAnimation } from '@/lib/hero-media'
import { heroMediaFromCms } from '@/lib/hero-media-server'

export const dynamic = 'force-dynamic'

async function getLocale(): Promise<Locale> {
  return (await cookies()).get('shop-locale')?.value === 'en' ? 'en' : 'de'
}

/** CMS-Texte der Sprache; leere/fehlende Übersetzungen fallen auf Deutsch zurück. */
async function loadCms(locale: Locale): Promise<Record<string, string>> {
  const entries = await prisma.cmsContent.findMany({
    where: { locale: { in: ['de', locale] } },
    select: { key: true, value: true, locale: true },
  })
  const cms: Record<string, string> = {}
  for (const e of entries) if (e.locale === 'de') cms[e.key] = e.value
  // Medien (Video, Animation, Sound) sind sprachunabhängig und kommen immer aus "de"
  const media: readonly string[] = HERO_MEDIA_KEYS
  for (const e of entries) {
    if (e.locale !== 'de' && e.value.trim() && !media.includes(e.key)) cms[e.key] = e.value
  }
  return cms
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  let cms: Record<string, string> = {}
  try {
    cms = await loadCms(locale)
  } catch { /* DB unreachable — use defaults */ }

  const title = cms['hero.title'] || (locale === 'en' ? 'Beekeeping' : 'Imkerei')
  const description = (cms['hero.text'] || (locale === 'en' ? 'Honey straight from the beekeeper' : 'Honig direkt vom Imker')).replace(/[*#_~`<>]/g, '').replace(/\n/g, ' ').trim()

  return {
    title: `KörBee — ${title}`,
    description,
    openGraph: {
      title: `KörBee — ${title}`,
      description,
      type: 'website',
    },
  }
}

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ animation?: string }> }) {
  const { animation: vorschau } = await searchParams
  const locale = await getLocale()
  let cms: Record<string, string> = {}
  let blogPosts: { id: string; title: string; slug: string; excerpt: string | null; coverImage: string | null; category: string; publishedAt: Date | null }[] = []
  try {
    ;[cms, blogPosts] = await Promise.all([
      loadCms(locale),
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, category: true, publishedAt: true },
      }),
    ])
  } catch { /* DB unreachable — show page with defaults */ }

  const media = heroMediaFromCms(cms)
  const { videoUrl, soundUrl } = media
  // ?animation=<id> zeigt eine Animation zur Vorschau, ohne sie live zu schalten
  // random-daily → über resolveHeroAnimation auflösen statt den Platzhalter-Eintrag zu nehmen
  const animation = vorschau === 'random-daily'
    ? resolveHeroAnimation({ 'hero.animation': 'random-daily' })
    : HERO_ANIMATIONS.find(a => a.id === vorschau) ?? media.animation

  return (
    <>
      <HoneyDripBackground videoUrl={videoUrl} />
      <LandingContent cms={cms} blogPosts={blogPosts} locale={locale} animation={animation} soundUrl={soundUrl} />
    </>
  )
}
