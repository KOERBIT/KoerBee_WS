'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ACTION_TYPES = [
  { value: 'inspection',    label: 'Durchschau' },
  { value: 'varroa',        label: 'Varroa Behandlung' },
  { value: 'feeding',       label: 'Füttern' },
  { value: 'honey_harvest', label: 'Honigernte' },
]

const NEEDS_AMOUNT = ['feeding', 'honey_harvest']
const UNITS: Record<string, string[]> = {
  feeding:      ['kg', 'l'],
  honey_harvest:['kg'],
}

interface Colony { id: string; name: string; apiary: { name: string } }
interface ActionForm { type: string; amount: string; unit: string }

export function NfcTagManager({ colonies }: { colonies: Colony[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uid, setUid] = useState('')
  const [label, setLabel] = useState('')
  const [colonyId, setColonyId] = useState(colonies[0]?.id ?? '')
  const [actions, setActions] = useState<ActionForm[]>([{ type: 'inspection', amount: '', unit: 'kg' }])
  const router = useRouter()

  function addAction() {
    setActions(a => [...a, { type: 'feeding', amount: '', unit: 'kg' }])
  }
  function removeAction(i: number) {
    setActions(a => a.filter((_, idx) => idx !== i))
  }
  function updateAction(i: number, key: keyof ActionForm, value: string) {
    setActions(a => a.map((act, idx) => {
      if (idx !== i) return act
      const updated = { ...act, [key]: value }
      if (key === 'type') updated.unit = UNITS[value]?.[0] ?? 'kg'
      return updated
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/nfc/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid, label: label || null, colonyId,
        actions: actions.map(a => ({
          type: a.type,
          defaultValues: NEEDS_AMOUNT.includes(a.type) && a.amount
            ? { amount: parseFloat(a.amount), unit: a.unit }
            : null,
        })),
      }),
    })
    setLoading(false)
    setOpen(false)
    setUid(''); setLabel(''); setActions([{ type: 'inspection', amount: '', unit: 'kg' }])
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-medium transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tag registrieren
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">NFC-Tag registrieren</h2>
              <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Tag-UID *</label>
                <input value={uid} onChange={e => setUid(e.target.value)} required placeholder="z.B. 04:A1:B2:C3:D4:E5"
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                <p className="text-[11px] text-zinc-400 mt-1">UID vom Tag-Aufkleber oder via Scan-Seite auslesen</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Bezeichnung</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="z.B. Stock A, Vordertür"
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Volk *</label>
                <select value={colonyId} onChange={e => setColonyId(e.target.value)} required
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                  {colonies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.apiary.name})</option>)}
                </select>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-medium text-zinc-700">Aktionen beim Scan</label>
                  <button type="button" onClick={addAction} className="text-[12px] text-amber-600 font-medium hover:text-amber-700">+ Aktion</button>
                </div>
                <div className="space-y-2">
                  {actions.map((action, i) => (
                    <div key={i} className="bg-zinc-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select value={action.type} onChange={e => updateAction(i, 'type', e.target.value)}
                          className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                          {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {actions.length > 1 && (
                          <button type="button" onClick={() => removeAction(i)} className="text-zinc-300 hover:text-rose-500 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>
                      {NEEDS_AMOUNT.includes(action.type) && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input type="number" step="0.1" min="0" value={action.amount}
                              onChange={e => updateAction(i, 'amount', e.target.value)}
                              placeholder="Standardmenge (optional)"
                              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          </div>
                          <select value={action.unit} onChange={e => updateAction(i, 'unit', e.target.value)}
                            className="border border-zinc-200 rounded-lg px-2 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                            {(UNITS[action.type] ?? ['kg', 'l']).map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading || !uid || !colonyId}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {loading ? 'Wird gespeichert…' : 'Tag registrieren'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
