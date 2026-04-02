'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/Modal'

interface Colony { id: string; name: string; apiary: { name: string } }

const TREATMENT_TYPES = [
  { value: 'varroa', label: 'Varroabehandlung' },
  { value: 'feeding', label: 'Fütterung' },
  { value: 'oxalic_acid', label: 'Oxalsäure' },
  { value: 'formic_acid', label: 'Ameisensäure' },
  { value: 'thymol', label: 'Thymol (Apiguard)' },
  { value: 'antibiotic', label: 'Antibiotikum' },
  { value: 'other', label: 'Sonstiges' },
]

const UNITS = ['ml', 'l', 'g', 'kg', 'Stück', 'Waben']

export function AddTreatmentButton({ colonies }: { colonies: Colony[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    colonyId: colonies[0]?.id ?? '',
    type: 'varroa',
    amount: '',
    unit: 'ml',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const router = useRouter()

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/treatments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: form.amount ? parseFloat(form.amount) : null }),
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
        Neue Behandlung
      </button>
      {open && (
        <Modal title="Neue Behandlung" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Volk *</label>
              <select value={form.colonyId} onChange={set('colonyId')} required
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                {colonies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.apiary.name})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Art *</label>
              <select value={form.type} onChange={set('type')} required
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                {TREATMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Menge</label>
                <input type="number" step="0.1" min="0" value={form.amount} onChange={set('amount')} placeholder="50"
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Einheit</label>
                <select value={form.unit} onChange={set('unit')}
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Datum *</label>
              <input type="date" value={form.date} onChange={set('date')} required
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Notizen</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Zusätzliche Infos..."
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none" />
            </div>
            <button type="submit" disabled={loading || !form.colonyId}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
              {loading ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
