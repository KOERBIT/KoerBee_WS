'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  category: string
  status: string
  publishedAt: string | null
  createdAt: string
}

const categoryConfig: Record<string, { label: string; className: string }> = {
  NEWS:   { label: 'News',   className: 'bg-blue-100 text-blue-700' },
  SAISON: { label: 'Saison', className: 'bg-green-100 text-green-700' },
  REZEPT: { label: 'Rezept', className: 'bg-orange-100 text-orange-700' },
  TIPP:   { label: 'Tipp',   className: 'bg-purple-100 text-purple-700' },
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PUBLISHED: { label: 'Veröffentlicht', className: 'bg-green-100 text-green-700' },
  DRAFT:     { label: 'Entwurf',        className: 'bg-zinc-100 text-zinc-500' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function BlogOverviewPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cms/blog')
      .then((res) => res.json())
      .then((data: BlogPost[]) => setPosts(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-5 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[13px] font-medium text-zinc-400 uppercase tracking-widest mb-1">
            Inhalte
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Blog</h1>
        </div>
        <Link
          href="/dashboard/blog/neu"
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[14px] font-semibold transition-colors"
        >
          Neuer Beitrag
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-zinc-400 text-[14px]">Wird geladen…</div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-zinc-400 text-[15px] mb-3">Noch keine Beiträge</p>
          <Link
            href="/dashboard/blog/neu"
            className="text-[14px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            Ersten Beitrag erstellen →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const cat = categoryConfig[post.category] ?? { label: post.category, className: 'bg-zinc-100 text-zinc-500' }
            const st  = statusConfig[post.status]   ?? { label: post.status,    className: 'bg-zinc-100 text-zinc-500' }

            return (
              <Link
                key={post.id}
                href={`/dashboard/blog/${post.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative bg-zinc-100">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📝
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cat.className}`}
                    >
                      {cat.label}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-zinc-900 truncate">{post.title}</p>
                  {post.excerpt && (
                    <p className="text-[13px] text-zinc-400 mt-0.5 truncate">{post.excerpt}</p>
                  )}
                </div>

                {/* Date */}
                <p className="text-[12px] text-zinc-400 shrink-0">
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
