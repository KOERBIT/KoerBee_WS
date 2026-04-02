'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type ScanState = 'idle' | 'scanning' | 'found' | 'notfound' | 'success' | 'error'

const ACTION_LABELS: Record<string, string> = {
  inspection:   'Durchsicht',
  varroa:       'Varroabehandlung',
  feeding:      'Fütterung',
  honey_harvest:'Honigernte',
  oxalic_acid:  'Oxalsäure',
  formic_acid:  'Ameisensäure',
  thymol:       'Thymol',
  other:        'Sonstiges',
}

const NEEDS_AMOUNT = ['feeding', 'varroa', 'honey_harvest', 'oxalic_acid', 'formic_acid', 'thymol']
const AMOUNT_UNITS: Record<string, string[]> = {
  feeding:      ['kg', 'l'],
  honey_harvest:['kg'],
  varroa:       ['ml', 'g'],
  oxalic_acid:  ['ml', 'g'],
  formic_acid:  ['ml', 'g'],
  thymol:       ['g', 'Stück'],
}

interface NfcAction { id: string; type: string; defaultValues: Record<string, string> | null }
interface Tag {
  id: string
  uid: string
  label: string | null
  colony: { id: string; name: string; apiary: { name: string } }
  actions: NfcAction[]
}

export default function NfcScanPage() {
  const [state, setState] = useState<ScanState>('idle')
  const [tag, setTag] = useState<Tag | null>(null)
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('kg')
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<string>('')
  const [manualUid, setManualUid] = useState('')
  const [useManual, setUseManual] = useState(false)

  const lookupTag = useCallback(async (uid: string) => {
    setState('scanning')
    const res = await fetch(`/api/nfc/lookup?uid=${encodeURIComponent(uid)}`)
    const data = await res.json()
    if (data.found) {
      setTag(data.tag)
      setSelectedAction(data.tag.actions[0]?.type ?? '')
      const firstAction = data.tag.actions[0]
      if (firstAction?.defaultValues?.unit) setUnit(firstAction.defaultValues.unit)
      if (firstAction?.defaultValues?.amount) setAmount(String(firstAction.defaultValues.amount))
      setState('found')
    } else {
      setState('notfound')
    }
  }, [])

  async function startNfcScan() {
    if (!('NDEFReader' in window)) {
      setUseManual(true)
      return
    }
    setState('scanning')
    try {
      const ndef = new (window as any).NDEFReader()
      await ndef.scan()
      ndef.addEventListener('reading', ({ serialNumber }: { serialNumber: string }) => {
        lookupTag(serialNumber)
      }, { once: true })
    } catch {
      setState('error')
      setResult('NFC-Scan fehlgeschlagen. Bitte manuell eingeben.')
      setUseManual(true)
    }
  }

  async function executeAction() {
    if (!tag || !selectedAction) return
    const res = await fetch('/api/nfc/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tagId: tag.id,
        actionType: selectedAction,
        amount: amount ? parseFloat(amount) : null,
        unit: unit || null,
        notes: notes || null,
      }),
    })
    if (res.ok) {
      const label = ACTION_LABELS[selectedAction] ?? selectedAction
      setResult(`✓ ${label} für ${tag.colony.name} gebucht`)
      setState('success')
    } else {
      setState('error')
      setResult('Fehler beim Buchen')
    }
  }

  function reset() {
    setState('idle')
    setTag(null)
    setSelectedAction('')
    setAmount('')
    setNotes('')
    setResult('')
    setManualUid('')
  }

  const currentAction = tag?.actions.find(a => a.type === selectedAction)
  const showAmount = NEEDS_AMOUNT.includes(selectedAction)
  const units = AMOUNT_UNITS[selectedAction] ?? ['kg', 'l', 'ml', 'g']

  return (
    <div className="px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/nfc" className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">NFC-Tag scannen</h1>
      </div>

      {/* Idle */}
      {state === 'idle' && !useManual && (
        <div className="flex flex-col items-center">
          <div className="w-40 h-40 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center mb-8">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6"/>
              <path d="M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6"/>
              <circle cx="12" cy="12" r="1" fill="#d97706"/>
            </svg>
          </div>
          <button onClick={startNfcScan}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-2xl py-4 text-[16px] font-semibold transition-colors shadow-sm mb-4">
            Tag scannen
          </button>
          <button onClick={() => setUseManual(true)}
            className="text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors">
            UID manuell eingeben
          </button>
          <p className="text-[12px] text-zinc-400 mt-6 text-center">
            Halte dein Telefon an den NFC-Chip am Bienenstock.<br/>
            Funktioniert auf Android mit Chrome.
          </p>
        </div>
      )}

      {/* Manual UID input */}
      {(useManual && state === 'idle') && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <p className="text-[13px] text-blue-700">NFC nicht verfügbar auf diesem Gerät — UID manuell eingeben</p>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Tag-UID</label>
            <input value={manualUid} onChange={e => setManualUid(e.target.value)}
              placeholder="z.B. 04:A1:B2:C3:D4:E5"
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
          </div>
          <button onClick={() => lookupTag(manualUid)} disabled={!manualUid.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl py-3 text-[14px] font-semibold transition-colors">
            Nachschlagen
          </button>
        </div>
      )}

      {/* Scanning */}
      {state === 'scanning' && (
        <div className="flex flex-col items-center py-12">
          <div className="w-20 h-20 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin mb-6" />
          <p className="text-[15px] font-medium text-zinc-700">Warte auf Tag…</p>
        </div>
      )}

      {/* Tag found */}
      {state === 'found' && tag && (
        <div className="space-y-5">
          <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
            <p className="text-[12px] font-medium text-green-600 uppercase tracking-wider mb-1">Tag erkannt</p>
            <p className="text-[16px] font-semibold text-zinc-900">{tag.colony.name}</p>
            <p className="text-[13px] text-zinc-500">{tag.colony.apiary.name}{tag.label ? ` · ${tag.label}` : ''}</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-2">Aktion</label>
            <div className="space-y-2">
              {tag.actions.length > 0 ? tag.actions.map(a => (
                <button key={a.type} onClick={() => {
                  setSelectedAction(a.type)
                  if (a.defaultValues?.unit) setUnit(a.defaultValues.unit as string)
                  if (a.defaultValues?.amount) setAmount(String(a.defaultValues.amount))
                }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-colors ${selectedAction === a.type ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 ${selectedAction === a.type ? 'border-amber-500 bg-amber-500' : 'border-zinc-300'}`} />
                  <span className="text-[14px] font-medium text-zinc-900">{ACTION_LABELS[a.type] ?? a.type}</span>
                </button>
              )) : (
                <div className="bg-zinc-50 rounded-xl px-4 py-3">
                  <p className="text-[13px] text-zinc-400">Keine Aktionen für diesen Tag konfiguriert.</p>
                  <Link href="/dashboard/nfc" className="text-[13px] text-amber-600 font-medium">Tag verwalten →</Link>
                </div>
              )}
            </div>
          </div>

          {showAmount && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">
                  {selectedAction === 'honey_harvest' ? 'Ernte' : selectedAction === 'feeding' ? 'Futtermenge' : 'Menge'}
                </label>
                <input type="number" step="0.1" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Einheit</label>
                <select value={unit} onChange={e => setUnit(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Notiz (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Zusätzliche Infos..."
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
          </div>

          <button onClick={executeAction} disabled={!selectedAction}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl py-3.5 text-[15px] font-semibold transition-colors">
            Jetzt buchen
          </button>
          <button onClick={reset} className="w-full text-[13px] text-zinc-400 hover:text-zinc-600 py-2 transition-colors">
            Abbrechen
          </button>
        </div>
      )}

      {/* Not found */}
      {state === 'notfound' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <p className="text-[15px] font-medium text-zinc-700">Tag nicht registriert</p>
          <p className="text-[13px] text-zinc-400 text-center">Dieser Tag ist noch keinem Volk zugeordnet.</p>
          <Link href="/dashboard/nfc" className="w-full bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl py-3 text-[14px] font-semibold transition-colors text-center">
            Tag jetzt registrieren
          </Link>
          <button onClick={reset} className="text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors">Erneut scannen</button>
        </div>
      )}

      {/* Success */}
      {state === 'success' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-[16px] font-semibold text-zinc-900">{result}</p>
          <p className="text-[13px] text-zinc-400">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
          <button onClick={reset}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 text-[14px] font-semibold transition-colors">
            Nächsten Tag scannen
          </button>
          <Link href="/dashboard" className="text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors">Zum Dashboard</Link>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <p className="text-[14px] text-zinc-600 text-center">{result}</p>
          <button onClick={reset} className="w-full bg-zinc-900 text-white rounded-xl py-3 text-[14px] font-semibold transition-colors">Erneut versuchen</button>
        </div>
      )}
    </div>
  )
}
