'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/Modal'

interface Apiary { id: string; name: string; status: string }

export function ApiaryDetailActions({ apiary }: { apiary: Apiary }) {
  const [showClose, setShowClose] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch(`/api/apiaries/${apiary.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed', statusNote: note, statusChangedAt: new Date().toISOString() }),
    })
    setLoading(false)
    setShowClose(false)
    router.refresh()
  }

  async function handleReactivate() {
    if (!confirm(`"${apiary.name}" wieder als aktiv markieren?`)) return
    await fetch(`/api/apiaries/${apiary.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active', statusNote: null, statusChangedAt: null }),
    })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {apiary.status === 'active' ? (
          <button
            onClick={() => setShowClose(true)}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 text-zinc-600 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-[13px] font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Standort aufgeben
          </button>
        ) : (
          <button
            onClick={handleReactivate}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 text-zinc-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50 rounded-xl text-[13px] font-medium transition-colors"
          >
            Wieder aktivieren
          </button>
        )}
      </div>

      {showClose && (
        <Modal title={`Standort aufgeben: ${apiary.name}`} onClose={() => setShowClose(false)}>
          <form onSubmit={handleClose} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Grund / Notiz</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} required
                placeholder="z.B. Pachtvertrag ausgelaufen, Umzug, Schäden durch Vandalen..."
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none" />
            </div>
            <p className="text-[12px] text-zinc-400">Der Standort wird nicht gelöscht — alle Völker und Daten bleiben erhalten.</p>
            <button type="submit" disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
              {loading ? 'Wird gespeichert…' : 'Standort aufgeben'}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
