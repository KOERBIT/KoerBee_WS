'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/Modal'
import { INSPECTION_CRITERIA } from '@/lib/inspection-criteria'

interface Colony { id: string; name: string; apiary: { name: string } }

export function AddInspectionButton({ colonies }: { colonies: Colony[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [colonyId, setColonyId] = useState(colonies[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const router = useRouter()

  function setValue(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const items = Object.entries(values)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([key, value]) => ({ key, value }))
    await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colonyId, date, notes, items }),
    })
    setLoading(false)
    setOpen(false)
    setValues({})
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Neue Inspektion
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Neue Inspektion</h2>
              <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Volk *</label>
                  <select value={colonyId} onChange={e => setColonyId(e.target.value)} required
                    className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                    {colonies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.apiary.name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Datum *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                    className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
              </div>

              <div className="border border-zinc-100 rounded-xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-100">
                  <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Kriterien</p>
                </div>
                <div className="divide-y divide-zinc-50">
                  {INSPECTION_CRITERIA.map(c => (
                    <div key={c.key} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-[13px] font-medium text-zinc-800">{c.label}</p>
                        {c.description && <p className="text-[11px] text-zinc-400 mt-0.5">{c.description}</p>}
                      </div>
                      <div className="ml-4 shrink-0">
                        {c.type === 'scale' && (
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(n => (
                              <button key={n} type="button"
                                onClick={() => setValue(c.key, String(n))}
                                className={`w-7 h-7 rounded-lg text-[13px] font-semibold transition-colors ${values[c.key] === String(n) ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                                {n}
                              </button>
                            ))}
                          </div>
                        )}
                        {c.type === 'number' && (
                          <input type="number" step="0.1" min="0" value={values[c.key] ?? ''} onChange={e => setValue(c.key, e.target.value)}
                            className="w-20 border border-zinc-200 rounded-lg px-2 py-1.5 text-[13px] text-center focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        )}
                        {c.type === 'boolean' && (
                          <button type="button" onClick={() => setValue(c.key, values[c.key] === 'ja' ? 'nein' : 'ja')}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${values[c.key] === 'ja' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                            {values[c.key] === 'ja' ? 'Ja' : 'Nein'}
                          </button>
                        )}
                        {c.type === 'text' && (
                          <input type="text" value={values[c.key] ?? ''} onChange={e => setValue(c.key, e.target.value)}
                            className="w-36 border border-zinc-200 rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Notizen</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Allgemeine Beobachtungen..."
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none" />
              </div>

              <button type="submit" disabled={loading || !colonyId}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {loading ? 'Wird gespeichert…' : 'Inspektion speichern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
