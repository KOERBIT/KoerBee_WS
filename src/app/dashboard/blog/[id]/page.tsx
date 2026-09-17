'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import type { JSONContent } from '@tiptap/react'
import MediaPicker from '@/components/cms/MediaPicker'

const TiptapEditor = dynamic(() => import('@/components/cms/TiptapEditor'), { ssr: false })

const CATEGORIES = [
  { value: 'NEWS',   label: 'News' },
  { value: 'SAISON', label: 'Saison' },
  { value: 'REZEPT', label: 'Rezept' },
  { value: 'TIPP',   label: 'Tipp' },
]

const inputClass =
  'w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors bg-white'

const labelClass = 'block text-[12px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5'

export default function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [title, setTitle]           = useState('')
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [content, setContent]       = useState<JSONContent | null>(null)
  const [category, setCategory]     = useState('NEWS')
  const [tags, setTags]             = useState('')
  const [excerpt, setExcerpt]       = useState('')
  const [seoTitle, setSeoTitle]     = useState('')
  const [seoDesc, setSeoDesc]       = useState('')
  const [mediaOpen, setMediaOpen]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetch(`/api/cms/blog/${id}`)
      .then((res) => res.json())
      .then((post) => {
        setTitle(post.title ?? '')
        setCoverImage(post.coverImage ?? null)
        setContent(post.content ?? null)
        setCategory(post.category ?? 'NEWS')
        setTags(Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags ?? ''))
        setExcerpt(post.excerpt ?? '')
        setSeoTitle(post.seoTitle ?? '')
        setSeoDesc(post.seoDescription ?? '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(status: 'DRAFT' | 'PUBLISHED') {
    if (!title.trim()) return
    setSaving(true)
    try {
      const body = {
        title: title.trim(),
        coverImage,
        content,
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        excerpt: excerpt.trim() || null,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDesc.trim() || null,
        status,
      }
      const res = await fetch(`/api/cms/blog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/cms/blog/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')
      router.push('/dashboard/blog')
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-5 py-8 max-w-5xl">
        <div className="text-center py-20 text-zinc-400 text-[14px]">Wird geladen…</div>
      </div>
    )
  }

  return (
    <div className="px-5 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/blog"
          className="text-[13px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ← Blog
        </Link>
        <span className="text-zinc-300">/</span>
        <p className="text-[13px] font-medium text-zinc-900 truncate max-w-[240px]">
          {title || 'Beitrag bearbeiten'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Main column */}
        <div className="space-y-4">
          {/* Title */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel des Beitrags"
              className="w-full text-xl font-semibold text-zinc-900 placeholder-zinc-300 border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Cover image */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className={labelClass}>Cover-Bild</p>
            <button
              type="button"
              onClick={() => setMediaOpen(true)}
              className="w-full h-48 rounded-xl border-2 border-dashed border-zinc-200 hover:border-amber-400 transition-colors overflow-hidden relative flex items-center justify-center text-zinc-400 text-[14px] font-medium"
            >
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt="Cover"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 700px"
                  unoptimized
                />
              ) : (
                'Cover-Bild auswählen'
              )}
            </button>
          </div>

          {/* Editor */}
          <div>
            <TiptapEditor content={content} onChange={setContent} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Category */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className={labelClass} htmlFor="category">Kategorie</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className={labelClass} htmlFor="tags">Tags</label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Honig, Sommer, Rezept"
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] text-zinc-400">Kommagetrennt eingeben</p>
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className={labelClass} htmlFor="excerpt">Kurzbeschreibung</label>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value.slice(0, 200))}
              placeholder="Kurze Zusammenfassung des Beitrags…"
              rows={4}
              className={inputClass + ' resize-none'}
            />
            <p className="mt-1.5 text-[11px] text-zinc-400 text-right">{excerpt.length}/200</p>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <p className={labelClass}>SEO</p>
            <div>
              <label className="block text-[12px] text-zinc-500 mb-1" htmlFor="seoTitle">
                SEO-Titel
              </label>
              <input
                id="seoTitle"
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Seitentitel für Suchmaschinen"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] text-zinc-500 mb-1" htmlFor="seoDesc">
                Meta-Beschreibung
              </label>
              <textarea
                id="seoDesc"
                value={seoDesc}
                onChange={(e) => setSeoDesc(e.target.value)}
                placeholder="Beschreibung für Suchmaschinen"
                rows={3}
                className={inputClass + ' resize-none'}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSave('PUBLISHED')}
              disabled={saving || !title.trim()}
              className="w-full px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[14px] font-semibold transition-colors"
            >
              {saving ? 'Wird gespeichert…' : 'Veröffentlichen'}
            </button>
            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={saving || !title.trim()}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 text-white text-[14px] font-semibold transition-colors"
            >
              Als Entwurf speichern
            </button>
          </div>

          {/* Delete */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full text-[14px] font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50 transition-colors py-1"
            >
              {deleting ? 'Wird gelöscht…' : 'Beitrag löschen'}
            </button>
          </div>
        </div>
      </div>

      <MediaPicker
        open={mediaOpen}
        onSelect={(url) => { setCoverImage(url); setMediaOpen(false) }}
        onClose={() => setMediaOpen(false)}
      />
    </div>
  )
}
