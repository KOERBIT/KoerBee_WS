import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import TiptapRenderer from '@/components/cms/TiptapRenderer'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({ where: { slug } })
  if (!post) return {}
  return {
    title: (post.seoTitle ?? post.title) + ' | KörBee',
    description: post.seoDescription ?? post.excerpt ?? undefined,
  }
}

const categoryLabels: Record<string, string> = {
  NEWS: 'News', SAISON: 'Saison', REZEPT: 'Rezept', TIPP: 'Tipp',
}
const categoryColors: Record<string, string> = {
  NEWS: 'bg-blue-100 text-blue-700', SAISON: 'bg-green-100 text-green-700',
  REZEPT: 'bg-orange-100 text-orange-700', TIPP: 'bg-purple-100 text-purple-700',
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { user: { select: { name: true } } },
  })

  if (!post || post.status !== 'PUBLISHED') notFound()

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pt-3 pb-2">
        <nav className="max-w-3xl mx-auto flex items-center justify-between gap-3 px-5 py-2.5" style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', borderRadius: 999, boxShadow: 'var(--shop-shadow)' }}>
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={32} height={32} className="rounded-lg" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: 'var(--shop-ink)' }}>KörBee</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/blog" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500 }} className="hover:opacity-70 transition-opacity">Alle Beiträge</Link>
            <Link href="/shop" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500 }} className="hover:opacity-70 transition-opacity">Shop</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Cover */}
        {post.coverImage && (
          <div className="rounded-[20px] overflow-hidden mb-8 h-64 sm:h-80 lg:h-96">
            <Image src={post.coverImage} alt={post.title} width={800} height={400} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {categoryLabels[post.category] ?? post.category}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--shop-dim)' }}>
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8" style={{ color: 'var(--shop-ink)' }}>{post.title}</h1>

        {/* Content */}
        <TiptapRenderer content={post.content as any} />

        {/* CTA */}
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--shop-border)' }}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/blog" className="text-[14px] font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>
              ← Alle Beiträge
            </Link>
            <Link
              href="/shop"
              className="px-5 py-2.5 rounded-full text-[14px] font-semibold transition-colors"
              style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg)', textDecoration: 'none' }}
            >
              Zum Shop →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto px-4 py-8" style={{ borderTop: '1px solid var(--shop-border)', fontSize: '.82rem', color: 'var(--shop-dim)' }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--shop-ink)' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={24} height={24} className="rounded-md" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.3rem' }}>KörBee</span>
          </Link>
          <div className="flex gap-6">
            <Link href="/impressum" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/datenschutz" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Datenschutz</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
