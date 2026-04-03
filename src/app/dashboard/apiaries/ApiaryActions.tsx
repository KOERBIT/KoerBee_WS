'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/Modal'
import dynamic from 'next/dynamic'

const ApiaryMapPicker = dynamic(
  () => import('@/components/ApiaryMapPicker').then(m => m.ApiaryMapPicker),
  { ssr: false, loading: () => <div className="h-[220px] bg-zinc-100 rounded-xl border border-zinc-200 animate-pulse" /> }
)

export interface ApiaryFormData {
  name: string
  lat: string
  lng: string
  notes: string
}

interface Apiary {
  id: string
  name: string
  lat: number | null
  lng: number | null
  notes: string | null
}

export function ApiaryForm({ initial, onSubmit, loading }: {
  initial?: Partial<ApiaryFormData>
  onSubmit: (data: ApiaryFormData) => void
  loading: boolean
}) {
  const [form, setForm] = useState<ApiaryFormData>({
    name: initial?.name ?? '',
    lat: initial?.lat ?? '',
    lng: initial?.lng ?? '',
    notes: initial?.notes ?? '',
  })
  const [gpsError, setGpsError] = useState<string | null>(null)

  const field = (key: keyof ApiaryFormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  const mapLat = form.lat ? parseFloat(form.lat) : undefined
  const mapLng = form.lng ? parseFloat(form.lng) : undefined

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Name *</label>
        <input {...field('name')} required placeholder="z.B. Standort Nord"
          className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[13px] font-medium text-zinc-700">Standort auf Karte wählen</label>
          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) return
              setGpsError(null)
              navigator.geolocation.getCurrentPosition(
                pos => setForm(f => ({
                  ...f,
                  lat: pos.coords.latitude.toFixed(6),
                  lng: pos.coords.longitude.toFixed(6),
                })),
                () => setGpsError('GPS-Standort konnte nicht ermittelt werden.')
              )
            }}
            className="flex items-center gap-1.5 text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <circle cx="12" cy="12" r="7" opacity="0.3"/>
            </svg>
            GPS jetzt setzen
          </button>
        </div>
        {gpsError && <p className="text-[12px] text-rose-600 mb-1.5">{gpsError}</p>}
        <ApiaryMapPicker
          lat={mapLat}
          lng={mapLng}
          onChange={(lat, lng) => setForm(f => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
        />
        <div className="grid grid-cols-2 gap-3 mt-2">
          <input {...field('lat')} type="number" step="any" placeholder="Breitengrad"
            className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
          <input {...field('lng')} type="number" step="any" placeholder="Längengrad"
            className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Notizen</label>
        <textarea {...field('notes')} rows={3} placeholder="Beschreibung, Zufahrt..."
          className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
        {loading ? 'Wird gespeichert…' : 'Speichern'}
      </button>
    </form>
  )
}

function toFloat(val: string): number | null {
  const f = parseFloat(val)
  return isNaN(f) ? null : f
}

export function AddApiaryButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: ApiaryFormData) {
    setLoading(true)
    await fetch('/api/apiaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        lat: toFloat(data.lat),
        lng: toFloat(data.lng),
        notes: data.notes || null,
      }),
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Neuer Standort
      </button>
      {open && (
        <Modal title="Neuer Standort" onClose={() => setOpen(false)}>
          <ApiaryForm onSubmit={handleSubmit} loading={loading} />
        </Modal>
      )}
    </>
  )
}

export function ApiaryRowActions({ apiary }: { apiary: Apiary }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleEdit(data: ApiaryFormData) {
    setLoading(true)
    await fetch(`/api/apiaries/${apiary.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        lat: toFloat(data.lat),
        lng: toFloat(data.lng),
        notes: data.notes || null,
      }),
    })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Standort "${apiary.name}" wirklich löschen? Alle Völker werden ebenfalls gelöscht.`)) return
    await fetch(`/api/apiaries/${apiary.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button onClick={handleDelete}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
      {editing && (
        <Modal title="Standort bearbeiten" onClose={() => setEditing(false)}>
          <ApiaryForm
            initial={{ name: apiary.name, lat: apiary.lat?.toString() ?? '', lng: apiary.lng?.toString() ?? '', notes: apiary.notes ?? '' }}
            onSubmit={handleEdit}
            loading={loading}
          />
        </Modal>
      )}
    </>
  )
}
