import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import LandingContent from '@/components/landing/LandingContent'
import HoneyDripBackground from '@/components/shop/HoneyDripBackground'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  let cms: Record<string, string> = {}
  try {
    const entries = await prisma.cmsContent.findMany({ where: { locale: 'de' }, select: { key: true, value: true } })
    for (const e of entries) cms[e.key] = e.value
  } catch { /* DB unreachable — use defaults */ }

  const title = cms['hero.title'] || 'KörBee — Imkerei'
  const description = (cms['hero.text'] || 'Honig direkt vom Imker').replace(/[*#_~`<>]/g, '').replace(/\n/g, ' ').trim()

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

export default async function LandingPage() {
  let cmsEntries: { key: string; value: string }[] = []
  let blogPosts: { id: string; title: string; slug: string; excerpt: string | null; coverImage: string | null; category: string; publishedAt: Date | null }[] = []
  try {
    ;[cmsEntries, blogPosts] = await Promise.all([
      prisma.cmsContent.findMany({ where: { locale: 'de' }, select: { key: true, value: true } }),
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, category: true, publishedAt: true },
      }),
    ])
  } catch { /* DB unreachable — show page with defaults */ }

  const cms: Record<string, string> = {}
  for (const e of cmsEntries) cms[e.key] = e.value

  return (
    <>
      <HoneyDripBackground videoUrl={cms['hero.video'] || undefined} />
      <LandingContent cms={cms} blogPosts={blogPosts} />
    </>
  )
}
