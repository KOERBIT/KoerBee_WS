# NFC-Aktionen, Larvenstadium-Grafik & Wetter+Karte — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NFC-Scan mit Tap-Formularen pro Aktion, Bienen-Icons in der Larvenstadium-Grafik des Zuchtkalenders, Wetter am Bienenstand mit Bienen-SVG-Icons und Leaflet-Karte.

**Architecture:** Drei unabhängige Feature-Blöcke. Jeder Block berührt nur seine eigenen Files — keine Shared-State-Abhängigkeiten. Leaflet wird als Client-Component mit `dynamic(..., { ssr: false })` eingebunden (SSR-Inkompatibilität von Leaflet).

**Tech Stack:** Next.js 16.2.1, React 19, Tailwind v4, Leaflet 1.9 + react-leaflet 5 (bereits installiert), Open-Meteo API (kein Key), Prisma v7, TypeScript

---

## Datei-Übersicht

| Datei | Aktion | Inhalt |
|-------|--------|--------|
| `src/app/dashboard/nfc/scan/page.tsx` | Modify | Tap-Formular pro Aktionstyp |
| `src/app/api/nfc/execute/route.ts` | Modify | InspectionItems bei Durchschau speichern |
| `src/app/dashboard/breeding/page.tsx` | Modify | PhaseTimeline mit Bienen-SVGs ersetzen |
| `src/components/BeeWeatherIcon.tsx` | Create | SVG-Bienen-Wettericons nach WMO-Code |
| `src/components/WeatherWidget.tsx` | Modify | BeeWeatherIcon statt Emoji |
| `src/components/ApiaryMap.tsx` | Create | Leaflet-Karte Client-Component |
| `src/app/dashboard/apiaries/ApiaryActions.tsx` | Modify | GPS-Button in ApiaryForm |
| `src/app/dashboard/apiaries/[id]/page.tsx` | Modify | ApiaryMap einbinden |

---

## Task 1: NFC Execute API — InspectionItems bei Durchschau

**Files:**
- Modify: `src/app/api/nfc/execute/route.ts`

- [ ] **Schritt 1: API erweitern**

Ersetze den gesamten Inhalt von `src/app/api/nfc/execute/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface InspectionItemInput {
  key: string
  value: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tagId, actionType, amount, unit, notes, items } = await req.json()

  const tag = await prisma.nfcTag.findFirst({
    where: { id: tagId, colony: { apiary: { userId: session.user.id } } },
    include: { colony: true },
  })
  if (!tag) return NextResponse.json({ error: 'Tag nicht gefunden' }, { status: 404 })

  const now = new Date()

  if (actionType === 'inspection') {
    const inspection = await prisma.inspection.create({
      data: {
        colonyId: tag.colonyId,
        date: now,
        notes: notes ?? 'Via NFC-Scan',
        createdOffline: false,
        items: items && items.length > 0
          ? { create: (items as InspectionItemInput[]).map(i => ({ key: i.key, value: i.value })) }
          : undefined,
      },
    })
    return NextResponse.json({ ok: true, type: 'inspection', id: inspection.id })
  }

  if (['varroa', 'feeding', 'honey_harvest', 'oxalic_acid', 'formic_acid', 'thymol', 'other'].includes(actionType)) {
    const treatment = await prisma.treatment.create({
      data: {
        colonyId: tag.colonyId,
        type: actionType,
        amount: amount ?? null,
        unit: unit ?? null,
        date: now,
        notes: notes ?? 'Via NFC-Scan',
      },
    })
    return NextResponse.json({ ok: true, type: 'treatment', id: treatment.id })
  }

  return NextResponse.json({ error: 'Unbekannter Aktionstyp' }, { status: 400 })
}
```

- [ ] **Schritt 2: Build-Check**

```bash
npm run build 2>&1 | tail -20
```
Erwartet: Kein TypeScript-Fehler in execute/route.ts

- [ ] **Schritt 3: Commit**

```bash
git add src/app/api/nfc/execute/route.ts
git commit -m "feat: NFC execute — InspectionItems bei Durchschau speichern"
```

---

## Task 2: NFC Scan-Seite — Tap-Formulare pro Aktionstyp

**Files:**
- Modify: `src/app/dashboard/nfc/scan/page.tsx`

- [ ] **Schritt 1: Datei vollständig ersetzen**

Ersetze `src/app/dashboard/nfc/scan/page.tsx` mit folgendem Inhalt:

```typescript
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
interface FeedingForm { amount: number; unit: string }

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
            <TapButton key={u} label={u} selected={value.unit === u} onSelect={() => onChange({ ...value, unit: u })} />
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
const EMPTY_FEEDING: FeedingForm = { amount: 1, unit: 'Zuckerwasser' }

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

  function buildItems(): { key: string; value: string }[] {
    const f = inspectionForm
    const items: { key: string; value: string }[] = []
    if (f.varroa)       items.push({ key: 'varroa',        value: f.varroa })
    if (f.population)   items.push({ key: 'population',    value: String(f.population) })
    if (f.queen_seen)   items.push({ key: 'queen_seen',    value: f.queen_seen })
    if (f.temperament)  items.push({ key: 'temperament',   value: f.temperament })
    if (f.brood_pattern)items.push({ key: 'brood_pattern', value: f.brood_pattern })
    if (f.swarm_drive)  items.push({ key: 'swarm_drive',   value: f.swarm_drive })
    return items
  }

  async function executeAction() {
    if (!tag || !selectedAction) return
    const body: Record<string, unknown> = { tagId: tag.id, actionType: selectedAction }
    if (selectedAction === 'inspection') {
      body.items = buildItems()
    } else if (selectedAction === 'feeding') {
      body.amount = feedingForm.amount
      body.unit = feedingForm.unit
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
            {selectedAction === 'inspection' ? 'Durchschau buchen' :
             selectedAction === 'feeding'    ? 'Fütterung buchen' :
             selectedAction === 'honey_harvest' ? 'Honigernte buchen' :
             selectedAction === 'varroa'    ? 'Behandlung buchen' : 'Jetzt buchen'}
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
```

- [ ] **Schritt 2: Build-Check**

```bash
npm run build 2>&1 | tail -20
```
Erwartet: Kein TypeScript-Fehler

- [ ] **Schritt 3: Commit**

```bash
git add src/app/dashboard/nfc/scan/page.tsx
git commit -m "feat: NFC-Scan Tap-Formulare — Durchschau mit 6 Feldern, Füttern mit Stepper"
```

---

## Task 3: Larvenstadium-Grafik — Bienen-Icons in Breeding-Seite

**Files:**
- Modify: `src/app/dashboard/breeding/page.tsx`

Die bestehende `PhaseIcon`-Komponente wird durch detailliertere Bienen-SVGs ersetzt und eine neue `PhaseTimeline`-Komponente fügt die Verbindungslinien und Status-Badges hinzu.

- [ ] **Schritt 1: PhaseIcon und PhaseTimeline in breeding/page.tsx ersetzen**

Finde in `src/app/dashboard/breeding/page.tsx` die Funktion `PhaseIcon` (Zeile 14–65) und ersetze sie sowie die Render-Logik der Event-Buttons. Ersetze zuerst `PhaseIcon`:

```typescript
function PhaseIcon({ type, size = 28 }: { type: string; size?: number }) {
  const s = size
  switch (type) {
    case 'graft':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 4 L26 9.5 L26 20.5 L16 26 L6 20.5 L6 9.5 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12"/>
          <path d="M11 19 Q11 12 17 12 Q22 12 22 17 Q22 20 19 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <circle cx="19.5" cy="21.5" r="1.5" fill="currentColor"/>
        </svg>
      )
    case 'check':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="13" cy="14" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
          <line x1="18.5" y1="19.5" x2="24" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M10 16 Q10 12 13 12 Q16 12 16 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <circle cx="16" cy="15.5" r="1" fill="currentColor"/>
        </svg>
      )
    case 'hatch':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 6 L24 10.5 L24 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <path d="M8 10.5 L8 19 L16 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <ellipse cx="16" cy="14" rx="4" ry="6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12.2" y1="13" x2="19.8" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <line x1="12" y1="15.5" x2="20" y2="15.5" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <path d="M14 8.5 Q12 6 11 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M18 8.5 Q20 6 21 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        </svg>
      )
    case 'mating':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <ellipse cx="10" cy="13" rx="6" ry="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" transform="rotate(-20 10 13)"/>
          <ellipse cx="22" cy="13" rx="6" ry="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" transform="rotate(20 22 13)"/>
          <ellipse cx="16" cy="18" rx="3.5" ry="7" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12.6" y1="15" x2="19.4" y2="15" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
          <line x1="12.4" y1="18" x2="19.6" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
          <path d="M13 10 L14.5 7 L16 9 L17.5 7 L19 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      )
    case 'laying':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M7 10 L12 7 L17 10 L17 16 L12 19 L7 16 Z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1"/>
          <path d="M15 10 L20 7 L25 10 L25 16 L20 19 L15 16 Z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1"/>
          <path d="M11 19 L16 16 L21 19 L21 25 L16 28 L11 25 Z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1"/>
          <ellipse cx="12" cy="13" rx="1.5" ry="2.5" fill="currentColor" transform="rotate(15 12 13)"/>
          <ellipse cx="20" cy="13" rx="1.5" ry="2.5" fill="currentColor" transform="rotate(15 20 13)"/>
          <ellipse cx="16" cy="22" rx="1.5" ry="2.5" fill="currentColor" transform="rotate(15 16 22)"/>
        </svg>
      )
    case 'assessment':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <ellipse cx="16" cy="20" rx="4" ry="6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12.2" y1="18" x2="19.8" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <line x1="12" y1="21" x2="20" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <ellipse cx="10" cy="16" rx="4" ry="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" transform="rotate(-15 10 16)"/>
          <ellipse cx="22" cy="16" rx="4" ry="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" transform="rotate(15 22 16)"/>
          <polygon points="16,3 17.2,6.6 21,6.6 18,8.8 19.2,12.4 16,10.2 12.8,12.4 14,8.8 11,6.6 14.8,6.6" fill="currentColor" fillOpacity="0.8"/>
        </svg>
      )
    default:
      return null
  }
}
```

- [ ] **Schritt 2: PhaseTimeline-Komponente hinzufügen**

Füge direkt nach `PhaseIcon` folgende neue Komponente ein. `toggleEvent` kommt als Prop rein (es ist in `BreedingPage` definiert, nicht im äußeren Scope):

```typescript
function PhaseTimeline({
  batch,
  toggleEvent,
}: {
  batch: BreedingBatch
  toggleEvent: (eventId: string, completed: boolean) => Promise<void>
}) {
  const phases = ['graft', 'check', 'hatch', 'mating', 'laying', 'assessment']
  const next = nextEvent(batch)

  return (
    <div className="mt-2 mb-1">
      <div className="flex items-start">
        {phases.map((phase, idx) => {
          const event = batch.events.find(e => e.type === phase)
          const isDone = event?.completed ?? false
          const isActive = event?.id === next?.id
          const meta = EVENT_LABELS[phase]

          return (
            <div key={phase} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-shrink-0">
                <button
                  onClick={() => event && toggleEvent(event.id, !event.completed)}
                  disabled={!event}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-all ${
                    isDone
                      ? 'bg-green-100 text-green-700'
                      : isActive
                      ? 'bg-amber-50 text-amber-600 ring-2 ring-amber-400 ring-offset-1'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  <PhaseIcon type={phase} size={20} />
                  {isDone && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                        <polyline points="2,5 4,7 8,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </button>
                <span className={`text-[9px] font-semibold mt-1.5 text-center leading-tight max-w-[40px] ${
                  isDone ? 'text-green-600' : isActive ? 'text-amber-600' : 'text-zinc-400'
                }`}>
                  {meta?.label}
                </span>
                {event && (
                  <span className={`text-[8px] mt-0.5 ${isDone ? 'text-green-500' : isActive ? 'text-amber-500' : 'text-zinc-300'}`}>
                    {new Date(event.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
              {idx < phases.length - 1 && (
                <div className={`h-0.5 flex-1 mt-5 mx-1 rounded-full ${isDone ? 'bg-green-300' : 'bg-zinc-100'}`} />
              )}
            </div>
          )
        })}
      </div>

      {next && (() => {
        const days = daysUntil(next.date)
        return (
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${
            days < 0 ? 'bg-rose-50 text-rose-600' : days === 0 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-50 text-zinc-600'
          }`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {days < 0
              ? `${EVENT_LABELS[next.type]?.label} — ${Math.abs(days)} Tage überfällig`
              : days === 0
              ? `${EVENT_LABELS[next.type]?.label} — Heute!`
              : `${EVENT_LABELS[next.type]?.label} in ${days} Tagen`
            }
          </div>
        )
      })()}
    </div>
  )
}
```

- [ ] **Schritt 3: PhaseTimeline im Batch-Render einbauen**

In der Batch-Render-Schleife (nach dem `<div className="flex items-start justify-between mb-3">` Block), ersetze die bestehende Event-Timeline (`<div className="flex flex-wrap gap-2">...</div>`) durch:

```tsx
<PhaseTimeline batch={batch} toggleEvent={toggleEvent} />
```

- [ ] **Schritt 4: Build-Check**

```bash
npm run build 2>&1 | tail -20
```
Erwartet: Keine TypeScript-Fehler

- [ ] **Schritt 5: Commit**

```bash
git add src/app/dashboard/breeding/page.tsx
git commit -m "feat: Zuchtkalender — Larvenstadium-Grafik mit Bienen-SVG-Icons"
```

---

## Task 4: BeeWeatherIcon-Komponente

**Files:**
- Create: `src/components/BeeWeatherIcon.tsx`

- [ ] **Schritt 1: Datei erstellen**

```typescript
// src/components/BeeWeatherIcon.tsx
// Bienen-SVG-Wettericons nach WMO-Wettercodes (Open-Meteo)

function wmoGroup(code: number): 'sunny' | 'cloudy' | 'foggy' | 'rainy' | 'snowy' | 'stormy' {
  if (code === 0 || code === 1) return 'sunny'
  if (code === 2 || code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'foggy'
  if (code >= 51 && code <= 82) return 'rainy'
  if (code >= 71 && code <= 77) return 'snowy'
  if (code >= 95) return 'stormy'
  return 'cloudy'
}

function SunnyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Sonne */}
      <circle cx="28" cy="28" r="12" fill="#fbbf24" opacity="0.9"/>
      <line x1="28" y1="10" x2="28" y2="15" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="28" y1="41" x2="28" y2="46" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="28" x2="15" y2="28" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="41" y1="28" x2="46" y2="28" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="15" y1="15" x2="19" y2="19" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="37" y1="37" x2="41" y2="41" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="41" y1="15" x2="37" y2="19" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="15" y1="41" x2="19" y2="37" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Biene */}
      <ellipse cx="54" cy="55" rx="11" ry="7.5" fill="#fbbf24" transform="rotate(-20 54 55)"/>
      <ellipse cx="50" cy="48" rx="8" ry="5" fill="#1f2937" opacity="0.25" transform="rotate(-20 50 48)"/>
      <ellipse cx="57" cy="51" rx="7" ry="4" fill="#1f2937" opacity="0.2" transform="rotate(-20 57 51)"/>
      <ellipse cx="46" cy="43" rx="9" ry="5" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-30 46 43)"/>
      <ellipse cx="56" cy="42" rx="8" ry="4" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-10 56 42)"/>
      <circle cx="44" cy="57" r="6" fill="#fbbf24"/>
      <circle cx="42" cy="55.5" r="1.4" fill="#1f2937"/>
      <circle cx="46" cy="55.5" r="1.4" fill="#1f2937"/>
      <path d="M42 53 Q39 49 37 47" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M46 53 Q47 49 48 46" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="37" cy="47" r="1.8" fill="#1f2937"/>
      <circle cx="48" cy="46" r="1.8" fill="#1f2937"/>
    </svg>
  )
}

function CloudyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Wolke */}
      <ellipse cx="42" cy="26" rx="18" ry="12" fill="#d1d5db"/>
      <ellipse cx="28" cy="31" rx="13" ry="10" fill="#d1d5db"/>
      <ellipse cx="52" cy="33" rx="11" ry="9" fill="#e5e7eb"/>
      <ellipse cx="38" cy="38" rx="22" ry="11" fill="#e5e7eb"/>
      {/* Biene darunter */}
      <ellipse cx="30" cy="60" rx="11" ry="7" fill="#fbbf24" transform="rotate(-15 30 60)"/>
      <ellipse cx="26" cy="53" rx="8" ry="4.5" fill="#1f2937" opacity="0.22" transform="rotate(-15 26 53)"/>
      <ellipse cx="34" cy="56" rx="7" ry="4" fill="#1f2937" opacity="0.18" transform="rotate(-15 34 56)"/>
      <ellipse cx="22" cy="49" rx="9" ry="5" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-25 22 49)"/>
      <ellipse cx="32" cy="48" rx="8" ry="4" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-5 32 48)"/>
      <circle cx="20" cy="62" r="6" fill="#fbbf24"/>
      <circle cx="18" cy="60.5" r="1.4" fill="#1f2937"/>
      <circle cx="22" cy="60.5" r="1.4" fill="#1f2937"/>
      <path d="M18 58 Q15 54 13 52" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M22 58 Q23 54 24 51" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function RainyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Wolke */}
      <ellipse cx="40" cy="22" rx="17" ry="11" fill="#9ca3af"/>
      <ellipse cx="26" cy="27" rx="12" ry="9" fill="#9ca3af"/>
      <ellipse cx="50" cy="29" rx="11" ry="8" fill="#6b7280"/>
      <ellipse cx="36" cy="33" rx="20" ry="10" fill="#6b7280"/>
      {/* Regentropfen */}
      <line x1="24" y1="46" x2="21" y2="55" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="34" y1="46" x2="31" y2="55" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="44" y1="46" x2="41" y2="55" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      {/* Biene mit Regenschirm (vereinfacht: Biene fliegt weg) */}
      <ellipse cx="62" cy="55" rx="9" ry="6" fill="#fbbf24" transform="rotate(-20 62 55)"/>
      <ellipse cx="57" cy="47" rx="8" ry="4.5" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-30 57 47)"/>
      <ellipse cx="67" cy="47" rx="7" ry="3.5" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-5 67 47)"/>
      <circle cx="54" cy="58" r="5" fill="#fbbf24"/>
      <circle cx="52.5" cy="56.5" r="1.2" fill="#1f2937"/>
      <circle cx="55.5" cy="56.5" r="1.2" fill="#1f2937"/>
    </svg>
  )
}

function SnowyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <ellipse cx="40" cy="22" rx="17" ry="11" fill="#bfdbfe"/>
      <ellipse cx="26" cy="27" rx="12" ry="9" fill="#bfdbfe"/>
      <ellipse cx="36" cy="33" rx="20" ry="10" fill="#dbeafe"/>
      {/* Schneeflocken */}
      <line x1="24" y1="46" x2="24" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="20" y1="50" x2="28" y2="52" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="20" y1="52" x2="28" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="38" y1="48" x2="38" y2="58" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="34" y1="53" x2="42" y2="53" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Biene eingemummelt */}
      <ellipse cx="60" cy="58" rx="10" ry="6.5" fill="#fbbf24" transform="rotate(-10 60 58)"/>
      <circle cx="50" cy="60" r="5.5" fill="#fbbf24"/>
      <circle cx="49" cy="58.5" r="1.3" fill="#1f2937"/>
      <circle cx="52" cy="58.5" r="1.3" fill="#1f2937"/>
    </svg>
  )
}

function StormyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <ellipse cx="40" cy="20" rx="18" ry="12" fill="#4b5563"/>
      <ellipse cx="26" cy="26" rx="13" ry="10" fill="#374151"/>
      <ellipse cx="36" cy="32" rx="22" ry="11" fill="#374151"/>
      {/* Blitz */}
      <path d="M42 36 L34 52 L40 52 L32 68" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Biene flieht */}
      <ellipse cx="64" cy="52" rx="9" ry="6" fill="#fbbf24" transform="rotate(-25 64 52)"/>
      <ellipse cx="59" cy="44" rx="8" ry="4" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.85" transform="rotate(-35 59 44)"/>
      <circle cx="56" cy="55" r="5" fill="#fbbf24"/>
      <circle cx="54.5" cy="53.5" r="1.2" fill="#1f2937"/>
      <circle cx="57.5" cy="53.5" r="1.2" fill="#1f2937"/>
    </svg>
  )
}

function FoggyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <line x1="12" y1="28" x2="58" y2="28" stroke="#d1d5db" strokeWidth="6" strokeLinecap="round"/>
      <line x1="18" y1="40" x2="64" y2="40" stroke="#d1d5db" strokeWidth="6" strokeLinecap="round"/>
      <line x1="12" y1="52" x2="52" y2="52" stroke="#d1d5db" strokeWidth="6" strokeLinecap="round"/>
      {/* Biene im Nebel */}
      <ellipse cx="62" cy="62" rx="9" ry="6" fill="#fbbf24" opacity="0.7" transform="rotate(-15 62 62)"/>
      <ellipse cx="57" cy="55" rx="7" ry="4" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.7" transform="rotate(-25 57 55)"/>
      <circle cx="54" cy="64" r="5" fill="#fbbf24" opacity="0.7"/>
      <circle cx="52.5" cy="62.5" r="1.2" fill="#1f2937" opacity="0.7"/>
      <circle cx="55.5" cy="62.5" r="1.2" fill="#1f2937" opacity="0.7"/>
    </svg>
  )
}

export function BeeWeatherIcon({ code, size = 64 }: { code: number; size?: number }) {
  const group = wmoGroup(code)
  switch (group) {
    case 'sunny':  return <SunnyBee size={size} />
    case 'cloudy': return <CloudyBee size={size} />
    case 'rainy':  return <RainyBee size={size} />
    case 'snowy':  return <SnowyBee size={size} />
    case 'stormy': return <StormyBee size={size} />
    case 'foggy':  return <FoggyBee size={size} />
    default:       return <CloudyBee size={size} />
  }
}
```

- [ ] **Schritt 2: Build-Check**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Schritt 3: Commit**

```bash
git add src/components/BeeWeatherIcon.tsx
git commit -m "feat: BeeWeatherIcon — Bienen-SVG-Wettericons nach WMO-Code"
```

---

## Task 5: WeatherWidget — BeeWeatherIcon einbauen

**Files:**
- Modify: `src/components/WeatherWidget.tsx`

- [ ] **Schritt 1: WeatherWidget anpassen**

Ersetze den gesamten Inhalt von `src/components/WeatherWidget.tsx`:

```typescript
// Server component — fetches Open-Meteo (free, no API key)
import { BeeWeatherIcon } from '@/components/BeeWeatherIcon'

const WMO_LABELS: Record<number, string> = {
  0:  'Klarer Himmel',     1: 'Überwiegend klar',  2: 'Teilweise bewölkt',
  3:  'Bedeckt',           45: 'Nebel',             48: 'Reifnebel',
  51: 'Leichter Niesel',   53: 'Nieselregen',       55: 'Starker Niesel',
  61: 'Leichter Regen',    63: 'Regen',             65: 'Starker Regen',
  71: 'Leichter Schnee',   73: 'Schnee',            75: 'Starker Schnee',
  80: 'Leichte Schauer',   81: 'Schauer',           82: 'Starke Schauer',
  95: 'Gewitter',
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function wmoLabel(code: number) {
  return WMO_LABELS[code] ?? 'Unbekannt'
}

interface WeatherData {
  current: { temperature_2m: number; weathercode: number }
  daily: {
    time: string[]
    weathercode: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export async function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  let weather: WeatherData | null = null
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (res.ok) weather = await res.json()
  } catch {
    // Silently fail — network unavailable
  }

  if (!weather) return null

  const current = weather.current
  const days = weather.daily.time.slice(1, 4)

  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-6">
      <p className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Wetter am Bienenstand</p>
      <div className="flex items-stretch gap-4">
        {/* Aktuell */}
        <div className="flex-1 bg-amber-50 rounded-xl px-4 py-3 flex flex-col items-center justify-center text-center">
          <BeeWeatherIcon code={current.weathercode} size={64} />
          <p className="text-2xl font-semibold text-zinc-900 mt-1">{Math.round(current.temperature_2m)}°C</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{wmoLabel(current.weathercode)}</p>
          <p className="text-[11px] font-medium text-amber-600 mt-1">Aktuell</p>
        </div>

        {/* Vorschau 3 Tage */}
        <div className="flex gap-2 flex-1">
          {days.map((day, i) => {
            const d = new Date(day)
            const code = weather!.daily.weathercode[i + 1]
            const max = Math.round(weather!.daily.temperature_2m_max[i + 1])
            const min = Math.round(weather!.daily.temperature_2m_min[i + 1])
            return (
              <div key={day} className="flex-1 bg-zinc-50 rounded-xl px-2 py-3 flex flex-col items-center text-center">
                <p className="text-[11px] font-medium text-zinc-500">{WEEKDAYS[d.getDay()]}</p>
                <BeeWeatherIcon code={code} size={36} />
                <p className="text-[12px] font-semibold text-zinc-900 mt-1">{max}°</p>
                <p className="text-[11px] text-zinc-400">{min}°</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: Build-Check**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Schritt 3: Commit**

```bash
git add src/components/WeatherWidget.tsx
git commit -m "feat: WeatherWidget — Bienen-SVG-Icons statt Emoji"
```

---

## Task 6: ApiaryMap — Leaflet-Karte als Client-Komponente

**Files:**
- Create: `src/components/ApiaryMap.tsx`

Leaflet ist bereits installiert (`leaflet@1.9.4`, `react-leaflet@5.0.0`, `@types/leaflet`). Leaflet läuft nicht auf dem Server — die Komponente wird als Client-Component markiert und via `dynamic(..., { ssr: false })` eingebunden.

- [ ] **Schritt 1: Datei erstellen**

```typescript
// src/components/ApiaryMap.tsx
'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Leaflet default-Icon fix (Next.js bundler verschluckt die PNG-Assets)
const HIVE_ICON = L.divIcon({
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🍯</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

interface ApiaryMapProps {
  lat: number
  lng: number
  name: string
}

export function ApiaryMap({ lat, lng, name }: ApiaryMapProps) {
  useEffect(() => {
    // Sicherstellen, dass Leaflet-CSS geladen ist
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm mb-6" style={{ height: 200 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={HIVE_ICON}>
          <Popup>{name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
```

- [ ] **Schritt 2: Build-Check**

```bash
npm run build 2>&1 | tail -20
```
Erwartet: Kein Fehler. Leaflet-CSS wird client-seitig geladen — kein SSR-Fehler da Komponente erst via dynamic eingebunden wird (Task 7).

- [ ] **Schritt 3: Commit**

```bash
git add src/components/ApiaryMap.tsx
git commit -m "feat: ApiaryMap — Leaflet-Karte mit Bienenstock-Pin"
```

---

## Task 7: ApiaryMap in Apiary-Detailseite einbinden

**Files:**
- Modify: `src/app/dashboard/apiaries/[id]/page.tsx`

- [ ] **Schritt 1: Dynamic Import am Dateianfang hinzufügen**

Füge nach den bestehenden `import`-Zeilen in `src/app/dashboard/apiaries/[id]/page.tsx` ein:

```typescript
import dynamic from 'next/dynamic'

const ApiaryMap = dynamic(
  () => import('@/components/ApiaryMap').then(m => m.ApiaryMap),
  { ssr: false, loading: () => <div className="h-[200px] bg-zinc-100 rounded-2xl mb-6 animate-pulse" /> }
)
```

- [ ] **Schritt 2: Wetter-Block ersetzen**

Finde den Block (ca. Zeile 101–104):
```tsx
{/* Weather */}
{apiary.lat && apiary.lng && (
  <WeatherWidget lat={apiary.lat} lng={apiary.lng} />
)}
```

Ersetze durch:
```tsx
{/* Karte + Wetter */}
{apiary.lat && apiary.lng && (
  <>
    <ApiaryMap lat={apiary.lat} lng={apiary.lng} name={apiary.name} />
    <WeatherWidget lat={apiary.lat} lng={apiary.lng} />
  </>
)}
```

- [ ] **Schritt 3: Build-Check**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Schritt 4: Commit**

```bash
git add src/app/dashboard/apiaries/[id]/page.tsx
git commit -m "feat: Apiary-Detailseite — Leaflet-Karte + Bienen-Wetter eingebaut"
```

---

## Task 8: GPS-Button in ApiaryForm

**Files:**
- Modify: `src/app/dashboard/apiaries/ApiaryActions.tsx`

- [ ] **Schritt 1: GPS-Button in ApiaryForm einbauen**

Finde in `ApiaryActions.tsx` das Grid mit Breiten- und Längengrad-Inputs (ca. Zeile 47–58):

```tsx
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Breitengrad</label>
    <input {...field('lat')} type="number" step="any" placeholder="48.1351"
      className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
  </div>
  <div>
    <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Längengrad</label>
    <input {...field('lng')} type="number" step="any" placeholder="8.6821"
      className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
  </div>
</div>
```

Ersetze durch:

```tsx
<div>
  <div className="flex items-center justify-between mb-1.5">
    <label className="text-[13px] font-medium text-zinc-700">Koordinaten</label>
    <button
      type="button"
      onClick={() => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
          pos => setForm(f => ({
            ...f,
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
          })),
          () => alert('GPS-Standort konnte nicht ermittelt werden.')
        )
      }}
      className="flex items-center gap-1.5 text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        <circle cx="12" cy="12" r="7" opacity="0.3"/>
      </svg>
      GPS jetzt setzen
    </button>
  </div>
  <div className="grid grid-cols-2 gap-3">
    <input {...field('lat')} type="number" step="any" placeholder="Breitengrad 48.1351"
      className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
    <input {...field('lng')} type="number" step="any" placeholder="Längengrad 8.6821"
      className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
  </div>
</div>
```

- [ ] **Schritt 2: Build-Check**

```bash
npm run build 2>&1 | tail -20
```
Erwartet: Kein TypeScript-Fehler

- [ ] **Schritt 3: Abschluss-Commit**

```bash
git add src/app/dashboard/apiaries/ApiaryActions.tsx
git commit -m "feat: GPS-Button im Standort-Formular — Koordinaten per Klick setzen"
```

---

## Task 9: Vercel-Deploy und Abschluss

- [ ] **Schritt 1: Alle Änderungen prüfen**

```bash
git log --oneline -10
```

- [ ] **Schritt 2: Push zu GitHub (löst Vercel-Deploy aus)**

```bash
git push origin main
```

- [ ] **Schritt 3: Vercel-Build abwarten**

Vercel baut automatisch. Nach ~2 Minuten unter https://koer-bee-ws-ghzo.vercel.app prüfen:
- Apiary-Detailseite: Karte + Bienen-Wetterkarten sichtbar?
- Zuchtkalender: Phasen-Icons mit Verbindungslinien?
- NFC-Scan: Tap-Formular nach Tag-Erkennung?
