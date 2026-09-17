'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface MediaItem {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

interface MediaPickerProps {
  open: boolean
  onSelect: (url: string) => void
  onClose: () => void
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']

function isImage(pathname: string): boolean {
  const ext = pathname.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.includes(ext)
}

export default function MediaPicker({ open, onSelect, onClose }: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/media')
      .then((res) => res.json())
      .then((data: MediaItem[]) => {
        setItems(data.filter((item) => isImage(item.pathname)))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'blog')
      const res = await fetch('/api/media', { method: 'POST', body: formData })
      const newItem: MediaItem = await res.json()
      onSelect(newItem.url)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-800">Mediathek</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Wird hochgeladen…' : 'Hochladen'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              Schließen
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-zinc-400 text-center py-10">Wird geladen…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-10">Keine Bilder vorhanden.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => onSelect(item.url)}
                  className="aspect-square relative rounded-xl overflow-hidden border-2 border-transparent hover:border-amber-400 transition-colors focus:outline-none focus:border-amber-400"
                >
                  <Image
                    src={item.url}
                    alt={item.pathname}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, 25vw"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
