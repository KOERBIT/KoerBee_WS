'use client'

import { useState, useEffect, useRef } from 'react'

interface MediaItem {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

export default function MediathekPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch('/api/media')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function upload(file: File, folder: string) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    const res = await fetch('/api/media', { method: 'POST', body: fd })
    if (res.ok) {
      await load()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Upload fehlgeschlagen')
    }
    setUploading(false)
  }

  async function remove(url: string) {
    if (!confirm('Bild unwiderruflich löschen?')) return
    await fetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    load()
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Group by folder
  const grouped = items.reduce<Record<string, MediaItem[]>>((acc, item) => {
    const folder = item.pathname.split('/')[0] || 'sonstige'
    if (!acc[folder]) acc[folder] = []
    acc[folder].push(item)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Mediathek</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            {items.length} {items.length === 1 ? 'Bild' : 'Bilder'} gespeichert
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={async e => {
              const files = e.target.files
              if (!files) return
              for (const f of Array.from(files)) {
                await upload(f, 'media')
              }
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {uploading ? 'Wird hochgeladen…' : 'Bild hochladen'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-400">Laden…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-zinc-500 text-[14px]">Noch keine Bilder hochgeladen.</p>
          <p className="text-zinc-400 text-[12px] mt-1">Lade Bilder hoch für Produkte oder Seiteninhalt.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([folder, folderItems]) => (
          <div key={folder} className="mb-8">
            <h2 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              {folder === 'produkte' ? '🍯 Produkte' : folder === 'media' ? '📷 Allgemein' : `📁 ${folder}`}
              <span className="ml-2 text-zinc-400 font-normal normal-case">({folderItems.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {folderItems.map(item => (
                <div key={item.url} className="group relative bg-white rounded-xl border border-zinc-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-zinc-100">
                    <img src={item.url} alt={item.pathname} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] text-zinc-500 truncate">{item.pathname.split('/').pop()}</p>
                    <p className="text-[10px] text-zinc-400">{formatSize(item.size)}</p>
                  </div>
                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => copyUrl(item.url)}
                      className="bg-white/90 hover:bg-white text-zinc-700 rounded-lg px-3 py-1.5 text-[11px] font-medium shadow-sm"
                    >
                      {copied === item.url ? '✓ Kopiert' : 'URL kopieren'}
                    </button>
                    <button
                      onClick={() => remove(item.url)}
                      className="bg-red-500/90 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-[11px] font-medium shadow-sm"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
