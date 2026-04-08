# Colony Quick Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quick-action card to the colony detail page so users can manually book Durchsicht, Füttern, Varroa-Behandlung and Honigernte without an NFC scan.

**Architecture:** A new `ColonyQuickActions` client component is inserted between the info-cards and the Chronik on the colony detail page. It renders a 2×2 button grid; clicking a button toggles an inline form beneath the grid. On submit the component POSTs to the existing `/api/inspections` or `/api/treatments` endpoints and calls `router.refresh()` to reload the server-rendered Chronik.

**Tech Stack:** Next.js 15 App Router, React (client component), TypeScript, Tailwind CSS, Jest + React Testing Library

---

## File Map

| Action | File |
|---|---|
| Create component | `src/app/dashboard/colonies/[id]/ColonyQuickActions.tsx` |
| Create tests | `src/__tests__/components/ColonyQuickActions.test.tsx` |
| Modify page | `src/app/dashboard/colonies/[id]/page.tsx` |

---

### Task 1: Create the ColonyQuickActions component skeleton

**Files:**
- Create: `src/app/dashboard/colonies/[id]/ColonyQuickActions.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ActionType = 'inspection' | 'feeding' | 'varroa' | 'honey_harvest'

interface Props {
  colonyId: string
}

interface InspectionForm {
  varroa: string
  population: number
  queen_seen: string
  temperament: string
  brood_pattern: string
  swarm_drive: string
}

interface FeedingForm {
  amount: number
  foodType: string
}

interface HonigernteForm {
  zargen: number
}

const EMPTY_INSPECTION: InspectionForm = {
  varroa: '', population: 0, queen_seen: '', temperament: '', brood_pattern: '', swarm_drive: '',
}
const EMPTY_FEEDING: FeedingForm = { amount: 1, foodType: 'Zuckerwasser' }
const EMPTY_HONIGERNTE: HonigernteForm = { zargen: 1 }

export function ColonyQuickActions({ colonyId }: Props) {
  const router = useRouter()
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [inspectionForm, setInspectionForm] = useState<InspectionForm>(EMPTY_INSPECTION)
  const [feedingForm, setFeedingForm] = useState<FeedingForm>(EMPTY_FEEDING)
  const [honigernteForm, setHonigernteForm] = useState<HonigernteForm>(EMPTY_HONIGERNTE)
  const [loading, setLoading] = useState(false)

  function toggleAction(action: ActionType) {
    setActiveAction(prev => prev === action ? null : action)
  }

  async function submit() {
    if (!activeAction) return
    setLoading(true)
    try {
      if (activeAction === 'inspection') {
        const items = [
          inspectionForm.varroa        && { key: 'varroa',        value: inspectionForm.varroa },
          inspectionForm.population    && { key: 'population',    value: String(inspectionForm.population) },
          inspectionForm.queen_seen    && { key: 'queen_seen',    value: inspectionForm.queen_seen },
          inspectionForm.temperament   && { key: 'temperament',   value: inspectionForm.temperament },
          inspectionForm.brood_pattern && { key: 'brood_pattern', value: inspectionForm.brood_pattern },
          inspectionForm.swarm_drive   && { key: 'swarm_drive',   value: inspectionForm.swarm_drive },
        ].filter(Boolean)
        await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colonyId, items }),
        })
      } else if (activeAction === 'feeding') {
        await fetch('/api/treatments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colonyId, type: 'feeding',
            amount: feedingForm.amount, unit: 'kg', notes: feedingForm.foodType,
          }),
        })
      } else if (activeAction === 'varroa') {
        await fetch('/api/treatments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colonyId, type: 'varroa' }),
        })
      } else if (activeAction === 'honey_harvest') {
        await fetch('/api/treatments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colonyId, type: 'honey_harvest',
            amount: honigernteForm.zargen, unit: 'Zargen',
          }),
        })
      }
      setActiveAction(null)
      setInspectionForm(EMPTY_INSPECTION)
      setFeedingForm(EMPTY_FEEDING)
      setHonigernteForm(EMPTY_HONIGERNTE)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h2 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Schnellaktionen</h2>
      </div>
      <div className="p-4">
        {/* 2×2 Button Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <ActionButton
            action="inspection"
            label="Durchsicht"
            active={activeAction === 'inspection'}
            onToggle={toggleAction}
            colorClass="bg-green-50"
            activeColor="border-green-500"
            textColor="text-green-700"
            icon={<InspectionIcon />}
          />
          <ActionButton
            action="feeding"
            label="Füttern"
            active={activeAction === 'feeding'}
            onToggle={toggleAction}
            colorClass="bg-blue-50"
            activeColor="border-blue-500"
            textColor="text-blue-700"
            icon={<FeedingIcon />}
          />
          <ActionButton
            action="varroa"
            label="Varroa"
            active={activeAction === 'varroa'}
            onToggle={toggleAction}
            colorClass="bg-rose-50"
            activeColor="border-rose-500"
            textColor="text-rose-700"
            icon={<VarroaIcon />}
          />
          <ActionButton
            action="honey_harvest"
            label="Honigernte"
            active={activeAction === 'honey_harvest'}
            onToggle={toggleAction}
            colorClass="bg-yellow-50"
            activeColor="border-yellow-500"
            textColor="text-yellow-700"
            icon={<HonigernteIcon />}
          />
        </div>

        {/* Inline Forms */}
        {activeAction === 'inspection' && (
          <InspectionFormUI value={inspectionForm} onChange={setInspectionForm} />
        )}
        {activeAction === 'feeding' && (
          <FeedingFormUI value={feedingForm} onChange={setFeedingForm} />
        )}
        {activeAction === 'varroa' && (
          <VarroaFormUI />
        )}
        {activeAction === 'honey_harvest' && (
          <HonigernteFormUI value={honigernteForm} onChange={setHonigernteForm} />
        )}

        {activeAction && (
          <button
            onClick={submit}
            disabled={loading}
            className="w-full mt-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[14px] font-semibold transition-colors"
          >
            {loading ? 'Wird gebucht…' : SUBMIT_LABELS[activeAction]}
          </button>
        )}
      </div>
    </div>
  )
}

const SUBMIT_LABELS: Record<ActionType, string> = {
  inspection:    'Durchsicht buchen',
  feeding:       'Fütterung buchen',
  varroa:        'Behandlung buchen',
  honey_harvest: 'Honigernte buchen',
}

// ── ActionButton ─────────────────────────────────────────────────
function ActionButton({
  action, label, active, onToggle, colorClass, activeColor, textColor, icon,
}: {
  action: ActionType
  label: string
  active: boolean
  onToggle: (a: ActionType) => void
  colorClass: string
  activeColor: string
  textColor: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(action)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${colorClass} ${
        active ? activeColor : 'border-transparent'
      }`}
    >
      <span className={textColor}>{icon}</span>
      <span className={`text-[13px] font-semibold ${textColor}`}>{label}</span>
    </button>
  )
}

// ── TapButton (shared for tap-select fields) ─────────────────────
function TapButton({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`px-3 py-2 rounded-xl border-2 text-[13px] font-medium transition-colors ${
        selected
          ? 'border-amber-400 bg-amber-50 text-amber-800'
          : 'border-zinc-100 bg-white text-zinc-700 hover:border-zinc-200'
      }`}
    >
      {label}
    </button>
  )
}

// ── InspectionFormUI ─────────────────────────────────────────────
function InspectionFormUI({ value, onChange }: { value: InspectionForm; onChange: (v: InspectionForm) => void }) {
  const set = (key: keyof InspectionForm, val: string | number) => onChange({ ...value, [key]: val })
  return (
    <div className="space-y-4 border-t border-zinc-100 pt-4">
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Varroa-Befall</p>
        <div className="flex flex-wrap gap-2">
          {['<1%', '1–3%', '3–5%', '>5%'].map(v => (
            <TapButton key={v} label={v} selected={value.varroa === v} onSelect={() => set('varroa', v)} />
          ))}
        </div>
      </div>
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
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Königin gesehen</p>
        <div className="flex flex-wrap gap-2">
          {['Ja', 'Nein', 'Eilage gesehen'].map(v => (
            <TapButton key={v} label={v} selected={value.queen_seen === v} onSelect={() => set('queen_seen', v)} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Temperament</p>
        <div className="flex flex-wrap gap-2">
          {['Ruhig', 'Normal', 'Aggressiv'].map(v => (
            <TapButton key={v} label={v} selected={value.temperament === v} onSelect={() => set('temperament', v)} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-2">Brutnest</p>
        <div className="flex flex-wrap gap-2">
          {['Gut', 'Lückig', 'Schlecht'].map(v => (
            <TapButton key={v} label={v} selected={value.brood_pattern === v} onSelect={() => set('brood_pattern', v)} />
          ))}
        </div>
      </div>
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

// ── FeedingFormUI ────────────────────────────────────────────────
function FeedingFormUI({ value, onChange }: { value: FeedingForm; onChange: (v: FeedingForm) => void }) {
  const dec = () => onChange({ ...value, amount: Math.max(0, Math.round((value.amount - 0.5) * 10) / 10) })
  const inc = () => onChange({ ...value, amount: Math.round((value.amount + 0.5) * 10) / 10 })
  return (
    <div className="space-y-4 border-t border-zinc-100 pt-4">
      <div>
        <p className="text-[12px] font-semibold text-zinc-500 mb-3">Futtermenge</p>
        <div className="flex items-center justify-center gap-6">
          <button type="button" onClick={dec} className="w-12 h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-2xl text-zinc-700 transition-colors">−</button>
          <div className="text-center min-w-[64px]">
            <p className="text-3xl font-bold text-zinc-900">{value.amount.toFixed(1)}</p>
            <p className="text-[12px] text-zinc-400">kg</p>
          </div>
          <button type="button" onClick={inc} className="w-12 h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-2xl text-zinc-700 transition-colors">+</button>
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

// ── VarroaFormUI ─────────────────────────────────────────────────
function VarroaFormUI() {
  return (
    <div className="border-t border-zinc-100 pt-4">
      <p className="text-[12px] font-semibold text-zinc-500 mb-1">Behandlungsdatum</p>
      <p className="text-[15px] font-semibold text-zinc-900">
        {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </p>
      <p className="text-[12px] text-zinc-400 mt-1">Datum wird automatisch auf heute gesetzt</p>
    </div>
  )
}

// ── HonigernteFormUI ─────────────────────────────────────────────
function HonigernteFormUI({ value, onChange }: { value: HonigernteForm; onChange: (v: HonigernteForm) => void }) {
  const dec = () => onChange({ zargen: Math.max(1, value.zargen - 1) })
  const inc = () => onChange({ zargen: value.zargen + 1 })
  return (
    <div className="border-t border-zinc-100 pt-4">
      <p className="text-[12px] font-semibold text-zinc-500 mb-3">Anzahl Zargen</p>
      <div className="flex items-center justify-center gap-6">
        <button type="button" onClick={dec} className="w-12 h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-2xl text-zinc-700 transition-colors">−</button>
        <div className="text-center min-w-[64px]">
          <p className="text-3xl font-bold text-zinc-900">{value.zargen}</p>
          <p className="text-[12px] text-zinc-400">Zargen</p>
        </div>
        <button type="button" onClick={inc} className="w-12 h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-2xl text-zinc-700 transition-colors">+</button>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────
function InspectionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function FeedingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6 2 3 7 3 12a9 9 0 0018 0c0-5-3-10-9-10z"/><path d="M12 12v5"/>
    </svg>
  )
}
function VarroaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l9 4.5v5C21 17 17 21 12 22 7 21 3 17 3 11.5v-5z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}
function HonigernteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 4.8 5.2.8-3.8 3.6.9 5.3L12 14l-4.7 2.5.9-5.3L4.4 7.6l5.2-.8z"/>
    </svg>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/colonies/[id]/ColonyQuickActions.tsx
git commit -m "feat: add ColonyQuickActions client component skeleton"
```

---

### Task 2: Write tests for ColonyQuickActions

**Files:**
- Create: `src/__tests__/components/ColonyQuickActions.test.tsx`

- [ ] **Step 1: Create the test directory**

```bash
mkdir -p "C:/Users/koerbe/PycharmProjects/Bee/src/__tests__/components"
```

- [ ] **Step 2: Write the tests**

```tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ColonyQuickActions } from '@/app/dashboard/colonies/[id]/ColonyQuickActions'

// Mock next/navigation
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock fetch
global.fetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
})

describe('ColonyQuickActions', () => {
  it('renders all four action buttons', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    expect(screen.getByText('Durchsicht')).toBeInTheDocument()
    expect(screen.getByText('Füttern')).toBeInTheDocument()
    expect(screen.getByText('Varroa')).toBeInTheDocument()
    expect(screen.getByText('Honigernte')).toBeInTheDocument()
  })

  it('shows no inline form initially', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    expect(screen.queryByText('Fütterung buchen')).not.toBeInTheDocument()
    expect(screen.queryByText('Durchsicht buchen')).not.toBeInTheDocument()
  })

  it('opens feeding form when Füttern is clicked', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    expect(screen.getByText('Futtermenge')).toBeInTheDocument()
    expect(screen.getByText('Fütterung buchen')).toBeInTheDocument()
  })

  it('closes feeding form when Füttern is clicked again', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Füttern'))
    expect(screen.queryByText('Fütterung buchen')).not.toBeInTheDocument()
  })

  it('switches from feeding to varroa form', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Varroa'))
    expect(screen.queryByText('Futtermenge')).not.toBeInTheDocument()
    expect(screen.getByText('Behandlung buchen')).toBeInTheDocument()
  })

  it('POSTs to /api/treatments for Füttern and calls router.refresh()', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Fütterung buchen'))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/treatments',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"type":"feeding"'),
      })
    )
  })

  it('POSTs to /api/treatments for Varroa', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Varroa'))
    fireEvent.click(screen.getByText('Behandlung buchen'))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/treatments',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"type":"varroa"'),
      })
    )
  })

  it('POSTs to /api/inspections for Durchsicht', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Durchsicht'))
    fireEvent.click(screen.getByText('Durchsicht buchen'))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/inspections',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('closes the form after successful submit', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Fütterung buchen'))
    await waitFor(() => expect(screen.queryByText('Fütterung buchen')).not.toBeInTheDocument())
  })

  it('POSTs to /api/treatments for Honigernte with zargen count', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Honigernte'))
    // increment zargen once (default 1 → 2)
    fireEvent.click(screen.getAllByText('+')[0])
    fireEvent.click(screen.getByText('Honigernte buchen'))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.amount).toBe(2)
    expect(body.unit).toBe('Zargen')
  })
})
```

- [ ] **Step 3: Run tests — expect them to PASS (component is already written)**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx jest src/__tests__/components/ColonyQuickActions.test.tsx --no-coverage
```

Expected: all tests green

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/components/ColonyQuickActions.test.tsx
git commit -m "test: add ColonyQuickActions component tests"
```

---

### Task 3: Integrate ColonyQuickActions into the colony detail page

**Files:**
- Modify: `src/app/dashboard/colonies/[id]/page.tsx`

The component is inserted between the Info-Cards grid and the Chronik section.

- [ ] **Step 1: Add the import**

In `src/app/dashboard/colonies/[id]/page.tsx`, add to the existing imports at the top of the file:

```tsx
import { ColonyQuickActions } from './ColonyQuickActions'
```

- [ ] **Step 2: Insert the component**

Find the comment `{/* Dissolution note */}` (around line 159). Insert `<ColonyQuickActions>` directly after the dissolution note block and before the Chronik section. The Chronik section starts with `{/* Chronik – unified timeline */}`.

Replace this:
```tsx
      {/* Chronik – unified timeline */}
```

With:
```tsx
      <ColonyQuickActions colonyId={colony.id} />

      {/* Chronik – unified timeline */}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Run all tests**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx jest --no-coverage
```

Expected: all tests green

- [ ] **Step 5: Start dev server and manually verify**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npm run dev
```

Open `http://localhost:3000/dashboard/colonies/<any-colony-id>` and verify:
- Schnellaktionen-Karte erscheint zwischen Info-Cards und Chronik
- Alle 4 Buttons sichtbar
- Klick auf Button öffnet Formular inline
- Klick auf gleichen Button schließt Formular wieder
- Klick auf anderen Button wechselt das Formular
- Buchung speichert und Chronik aktualisiert sich

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/colonies/[id]/page.tsx
git commit -m "feat: integrate ColonyQuickActions into colony detail page"
```
