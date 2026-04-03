'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type ScanState = 'idle' | 'scanning' | 'found' | 'notfound' | 'success' | 'error'

const ACTION_LABELS: Record<string, string> = {
  inspection:    'Durchschau',
  varroa:        'Varroabehandlung',
  feeding:       'Füttern',
  honey_harvest: 'Honigernte',
}

interface NfcAction { id: string; type: string; defaultValues: Record<string, string> | null }
interface Tag {
  id: string
  uid: string
  label: string | null
  colony: { id: string; name: string; apiary: { name: string } }
  actions: NfcAction[]
}

// ── Tap-Button Baustein ──────────────────────────────────────────
function TapButton({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`px-4 py-2.5 rounded-xl border-2 text-[13px] font-medium transition-colors ${
        selected
          ? 'border-amber-400 bg-amber-50 text-amber-800'
          : 'border-zinc-100 bg-white text-zinc-700 hover:border-zinc-200'
      }`}
    >
      {label}
    </button>
  )
}

// ── Durchschau-Formular ──────────────────────────────────────────
interface InspectionForm {
  varroa: string
  population: number
  queen_seen: string
  temperament: string
  brood_pattern: string
  swarm_drive: string
}

function DurchschauForm({ value, onChange }: { value: InspectionForm; onChange: (v: InspectionForm) => void }) {
  const set = (key: keyof InspectionForm, val: string | number) =>
    onChange({ ...value, [key]: val })

  return (
    <div className="space-y-4">
      {/* Varroa */}
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Varroa-Befall</p>
        <div className="flex flex-wrap gap-2">
          {['<1%', '1–3%', '3–5%', '>5%'].map(v => (
            <TapButton key={v} label={v} selected={value.varroa === v} onSelect={() => set('varroa', v)} />
          ))}
        </div>
      </div>

      {/* Volksstärke */}
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Volksstärke</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => set('population', n)}
              className={`w-10 h-10 rounded-xl border-2 text-[13px] font-bold transition-colors ${
                value.population >= n
                  ? 'border-amber-400 bg-amber-400 text-white'
                  : 'border-zinc-100 bg-zinc-50 text-zinc-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Königin */}
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Königin gesehen</p>
        <div className="flex flex-wrap gap-2">
          {['Ja', 'Nein', 'Eilage gesehen'].map(v => (
            <TapButton key={v} label={v} selected={value.queen_seen === v} onSelect={() => set('queen_seen', v)} />
          ))}
        </div>
      </div>

      {/* Temperament */}
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Temperament</p>
        <div className="flex flex-wrap gap-2">
          {['Ruhig', 'Normal', 'Aggressiv'].map(v => (
            <TapButton key={v} label={v} selected={value.temperament === v} onSelect={() => set('temperament', v)} />
          ))}
        </div>
      </div>

      {/* Brutnest */}
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Brutnest</p>
        <div className="flex flex-wrap gap-2">
          {['Gut', 'Lückig', 'Schlecht'].map(v => (
            <TapButton key={v} label={v} selected={value.brood_pattern === v} onSelect={() => set('brood_pattern', v)} />
          ))}
        </div>
      </div>

      {/* Schwarmstimmung */}
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Schwarmstimmung</p>
        <div className="flex flex-wrap gap-2">
          {['Keine', 'Weiselzellen', 'Starke Triebe'].map(v => (
            <TapButton key={v} label={v} selected={value.swarm_drive === v} onSelect={() => set('swarm_drive', v)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Füttern-Formular ─────────────────────────────────────────────
interface FeedingForm { amount: number; foodType: string }

function FuetternForm({ value, onChange }: { value: FeedingForm; onChange: (v: FeedingForm) => void }) {
  const step = 0.5
  const dec = () => onChange({ ...value, amount: Math.max(0, Math.round((value.amount - step) * 10) / 10) })
  const inc = () => onChange({ ...value, amount: Math.round((value.amount + step) * 10) / 10 })

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-3">Futtermenge</p>
        <div className="flex items-center justify-center gap-6">
          <button type="button" onClick={dec}
            className="w-14 h-14 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-3xl font-light text-zinc-700 transition-colors flex items-center justify-center">
            −
          </button>
          <div className="text-center min-w-[72px]">
            <p className="text-3xl font-bold text-zinc-900">{value.amount.toFixed(1)}</p>
            <p className="text-[12px] text-zinc-400 font-medium">kg</p>
          </div>
          <button type="button" onClick={inc}
            className="w-14 h-14 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-3xl font-light text-zinc-700 transition-colors flex items-center justify-center">
            +
          </button>
        </div>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Futtertyp</p>
        <div className="flex gap-3">
          {['Zuckerwasser', 'Futterteig'].map(u => (
            <TapButton key={u} label={u} selected={value.foodType === u} onSelect={() => onChange({ ...value, foodType: u })} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Hauptseite ───────────────────────────────────────────────────
const EMPTY_INSPECTION: InspectionForm = {
  varroa: '', population: 0, queen_seen: '', temperament: '', brood_pattern: '', swarm_drive: '',
}
const EMPTY_FEEDING: FeedingForm = { amount: 1, foodType: 'Zuckerwasser' }

export default function NfcScanPage() {
  const [state, setState] = useState<ScanState>('idle')
  const [tag, setTag] = useState<Tag | null>(null)
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [inspectionForm, setInspectionForm] = useState<InspectionForm>(EMPTY_INSPECTION)
  const [feedingForm, setFeedingForm] = useState<FeedingForm>(EMPTY_FEEDING)
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
      setState('found')
    } else {
      setState('notfound')
    }
  }, [])

  async function startNfcScan() {
    if (!('NDEFReader' in window)) { setUseManual(true); return }
    setState('scanning')
    try {
      const ndef = new (window as any).NDEFReader()
      await ndef.scan()
      ndef.addEventListener('reading', ({ serialNumber }: { serialNumber: string }) => {
        lookupTag(serialNumber)
      }, { once: true })
    } catch {
      setState('error')
      setResult('NFC-Scan fehlgeschlagen.')
      setUseManual(true)
    }
  }

  function buildItems(f: InspectionForm): { key: string; value: string }[] {
    const items: { key: string; value: string }[] = []
    if (f.varroa)        items.push({ key: 'varroa',        value: f.varroa })
    if (f.population)    items.push({ key: 'population',    value: String(f.population) })
    if (f.queen_seen)    items.push({ key: 'queen_seen',    value: f.queen_seen })
    if (f.temperament)   items.push({ key: 'temperament',   value: f.temperament })
    if (f.brood_pattern) items.push({ key: 'brood_pattern', value: f.brood_pattern })
    if (f.swarm_drive)   items.push({ key: 'swarm_drive',   value: f.swarm_drive })
    return items
  }

  async function executeAction() {
    if (!tag || !selectedAction) return
    const body: Record<string, unknown> = { tagId: tag.id, actionType: selectedAction }
    if (selectedAction === 'inspection') {
      body.items = buildItems(inspectionForm)
    } else if (selectedAction === 'feeding') {
      body.amount = feedingForm.amount
      body.unit = 'kg'
      body.notes = feedingForm.foodType
    }
    const res = await fetch('/api/nfc/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setResult(`${ACTION_LABELS[selectedAction] ?? selectedAction} für ${tag.colony.name} gebucht`)
      setState('success')
    } else {
      setState('error')
      setResult('Fehler beim Buchen')
    }
  }

  function reset() {
    setState('idle'); setTag(null); setSelectedAction('')
    setInspectionForm(EMPTY_INSPECTION); setFeedingForm(EMPTY_FEEDING)
    setResult(''); setManualUid('')
  }

  return (
    <div className="px-4 py-8 max-w-md mx-auto pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/nfc"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-500">
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
        </div>
      )}

      {/* Manual */}
      {useManual && state === 'idle' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <p className="text-[13px] text-blue-700">NFC nicht verfügbar — UID manuell eingeben</p>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Tag-UID</label>
            <input value={manualUid} onChange={e => setManualUid(e.target.value)}
              placeholder="z.B. 04:A1:B2:C3"
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

      {/* Found */}
      {state === 'found' && tag && (
        <div className="space-y-5">
          <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
            <p className="text-[12px] font-medium text-green-600 uppercase tracking-wider mb-1">Tag erkannt</p>
            <p className="text-[16px] font-semibold text-zinc-900">{tag.colony.name}</p>
            <p className="text-[13px] text-zinc-500">{tag.colony.apiary.name}{tag.label ? ` · ${tag.label}` : ''}</p>
          </div>

          {/* Aktion wählen */}
          <div>
            <p className="text-[13px] font-medium text-zinc-700 mb-2">Aktion</p>
            {tag.actions.length === 0 ? (
              <div className="bg-zinc-50 rounded-xl px-4 py-3">
                <p className="text-[13px] text-zinc-400 mb-1">Keine Aktionen für diesen Tag konfiguriert.</p>
                <Link href="/dashboard/nfc" className="text-[13px] text-amber-600 font-medium">Tag verwalten →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {tag.actions.map(a => (
                  <button key={a.type} onClick={() => setSelectedAction(a.type)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-colors ${
                      selectedAction === a.type ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selectedAction === a.type ? 'border-amber-500 bg-amber-500' : 'border-zinc-300'}`} />
                    <span className="text-[14px] font-medium text-zinc-900">{ACTION_LABELS[a.type] ?? a.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Aktions-spezifisches Formular */}
          {selectedAction === 'inspection' && (
            <div className="bg-zinc-50 rounded-2xl p-4">
              <DurchschauForm value={inspectionForm} onChange={setInspectionForm} />
            </div>
          )}
          {selectedAction === 'feeding' && (
            <div className="bg-zinc-50 rounded-2xl p-4">
              <FuetternForm value={feedingForm} onChange={setFeedingForm} />
            </div>
          )}

          <button onClick={executeAction} disabled={!selectedAction}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl py-3.5 text-[15px] font-semibold transition-colors">
            {selectedAction === 'inspection'   ? 'Durchschau buchen' :
             selectedAction === 'feeding'      ? 'Fütterung buchen' :
             selectedAction === 'honey_harvest'? 'Honigernte buchen' :
             selectedAction === 'varroa'       ? 'Behandlung buchen' : 'Jetzt buchen'}
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
          <Link href="/dashboard/nfc"
            className="w-full bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl py-3 text-[14px] font-semibold transition-colors text-center">
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
          <p className="text-[16px] font-semibold text-zinc-900 text-center">{result}</p>
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
