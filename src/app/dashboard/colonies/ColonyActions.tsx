'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/Modal'

interface Apiary { id: string; name: string }
interface Colony { id: string; name: string; queenYear: number | null; queenColor: string | null; apiaryId: string; foundedAt?: string | null; notes?: string | null }

const QUEEN_COLORS = [
  { value: 'weiß', label: 'Weiß (2021, 2026)', dot: 'bg-white border border-zinc-300' },
  { value: 'gelb', label: 'Gelb (2022, 2027)', dot: 'bg-yellow-400' },
  { value: 'rot',  label: 'Rot (2023, 2028)',  dot: 'bg-red-500' },
  { value: 'grün', label: 'Grün (2024, 2029)', dot: 'bg-green-500' },
  { value: 'blau', label: 'Blau (2025, 2030)', dot: 'bg-blue-500' },
]

function ColonyForm({ initial, apiaries, onSubmit, loading }: {
  initial?: Partial<Colony>
  apiaries: Apiary[]
  onSubmit: (data: Omit<Colony, 'id'>) => void
  loading: boolean
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    apiaryId: initial?.apiaryId ?? (apiaries[0]?.id ?? ''),
    queenYear: initial?.queenYear?.toString() ?? '',
    queenColor: initial?.queenColor ?? '',
    foundedAt: initial?.foundedAt ? new Date(initial.foundedAt).toISOString().split('T')[0] : '',
    notes: initial?.notes ?? '',
  })

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name: form.name, apiaryId: form.apiaryId, queenYear: form.queenYear ? parseInt(form.queenYear) : null, queenColor: form.queenColor || null, foundedAt: form.foundedAt ? new Date(form.foundedAt).toISOString() : null, notes: form.notes || null }) }} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Name *</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="z.B. Volk 1"
          className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Standort *</label>
        <select value={form.apiaryId} onChange={e => setForm(f => ({ ...f, apiaryId: e.target.value }))} required
          className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
          {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Königinnjahr</label>
          <input value={form.queenYear} onChange={e => setForm(f => ({ ...f, queenYear: e.target.value }))} type="number" placeholder="2024" min="2000" max={new Date().getFullYear() + 1}
            className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Königinfarbe</label>
          <select value={form.queenColor} onChange={e => setForm(f => ({ ...f, queenColor: e.target.value }))}
            className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
            <option value="">— keine —</option>
            {QUEEN_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Gründungsdatum</label>
        <input value={form.foundedAt} onChange={e => setForm(f => ({ ...f, foundedAt: e.target.value }))} type="date"
          className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Notizen</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notizen und Infos zum Volk..."
          className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent min-h-[100px] resize-none" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
        {loading ? 'Wird gespeichert…' : 'Speichern'}
      </button>
    </form>
  )
}

export function AddColonyButton({ apiaries, defaultApiaryId }: { apiaries: Apiary[]; defaultApiaryId?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: Omit<Colony, 'id'>) {
    setLoading(true)
    await fetch('/api/colonies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
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
        Neues Volk
      </button>
      {open && (
        <Modal title="Neues Volk" onClose={() => setOpen(false)}>
          <ColonyForm apiaries={apiaries} onSubmit={handleSubmit} loading={loading} initial={defaultApiaryId ? { apiaryId: defaultApiaryId } : undefined} />
        </Modal>
      )}
    </>
  )
}

export function ColonyRowActions({ colony, apiaries }: { colony: Colony; apiaries: Apiary[] }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleEdit(data: Omit<Colony, 'id'>) {
    setLoading(true)
    await fetch(`/api/colonies/${colony.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Volk "${colony.name}" wirklich löschen?`)) return
    await fetch(`/api/colonies/${colony.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button onClick={handleDelete} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
      {editing && (
        <Modal title="Volk bearbeiten" onClose={() => setEditing(false)}>
          <ColonyForm initial={colony} apiaries={apiaries} onSubmit={handleEdit} loading={loading} />
        </Modal>
      )}
    </>
  )
}
