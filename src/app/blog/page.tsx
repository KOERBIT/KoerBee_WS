'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null
  coverImage: string | null; category: string; publishedAt: string
  user: { name: string | null }
}

const categoryColors: Record<string, string> = {
  NEWS: 'bg-blue-100 text-blue-700', SAISON: 'bg-green-100 text-green-700',
  REZEPT: 'bg-orange-100 text-orange-700', TIPP: 'bg-purple-100 text-purple-700',
}
const categoryLabels: Record<string, string> = {
  NEWS: 'News', SAISON: 'Saison', REZEPT: 'Rezept', TIPP: 'Tipp',
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    const url = filter ? `/api/cms/blog?category=${filter}` : '/api/cms/blog'
    fetch(url).then((r) => r.json()).then((d) => setPosts(Array.isArray(d) ? d : [])).catch(() => {})
  }, [filter])

  const filters = [
    { value: null, label: 'Alle' },
    { value: 'NEWS', label: 'News' },
    { value: 'SAISON', label: 'Saison' },
    { value: 'REZEPT', label: 'Rezept' },
    { value: 'TIPP', label: 'Tipp' },
  ]

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
            <Link href="/shop" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500 }} className="hover:opacity-70 transition-opacity">Shop</Link>
            <Link href="/blog" style={{ color: 'var(--shop-ink)', textDecoration: 'none', fontWeight: 600 }} className="hover:opacity-70 transition-opacity">Blog</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Neuigkeiten aus der Imkerei</h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--shop-dim)' }}>Saisonberichte, Rezepte und Tipps rund um Honig & Bienen</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((f) => (
            <button
              key={f.value ?? 'all'}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                filter === f.value ? 'bg-amber-500 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-100'
              }`}
              style={filter !== f.value ? { border: '1px solid var(--shop-border)' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🐝</p>
            <p style={{ color: 'var(--shop-dim)' }}>Noch keine Beiträge veröffentlicht.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="rounded-[20px] overflow-hidden hover:-translate-y-1 transition-transform" style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', boxShadow: 'var(--shop-shadow)', textDecoration: 'none', color: 'inherit' }}>
                {post.coverImage ? (
                  <div className="h-44">
                    <Image src={post.coverImage} alt="" width={400} height={176} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center text-5xl" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>🍯</div>
                )}
                <div className="p-5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColors[post.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {categoryLabels[post.category] ?? post.category}
                  </span>
                  <h2 className="text-[15px] font-bold mt-2 line-clamp-2" style={{ color: 'var(--shop-ink)' }}>{post.title}</h2>
                  {post.excerpt && <p className="text-[13px] mt-1.5 line-clamp-2" style={{ color: 'var(--shop-dim)' }}>{post.excerpt}</p>}
                  <p className="text-[12px] mt-3" style={{ color: 'var(--shop-dim)' }}>
                    {new Date(post.publishedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto px-4 py-8" style={{ borderTop: '1px solid var(--shop-border)', fontSize: '.82rem', color: 'var(--shop-dim)' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--shop-ink)' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={24} height={24} className="rounded-md" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.3rem' }}>KörBee</span>
          </Link>
          <div className="flex gap-6">
            <Link href="/shop" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Shop</Link>
            <Link href="/impressum" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/datenschutz" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Datenschutz</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
