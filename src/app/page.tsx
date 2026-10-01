import { prisma } from '@/lib/prisma'
import LandingContent from '@/components/landing/LandingContent'
import HoneyDripBackground from '@/components/shop/HoneyDripBackground'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const [cmsEntries, blogPosts] = await Promise.all([
    prisma.cmsContent.findMany({ where: { locale: 'de' }, select: { key: true, value: true } }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, category: true, publishedAt: true },
    }),
  ])

  const cms: Record<string, string> = {}
  for (const e of cmsEntries) cms[e.key] = e.value

  return (
    <>
      <HoneyDripBackground />
      <LandingContent cms={cms} blogPosts={blogPosts} />
    </>
  )
}
