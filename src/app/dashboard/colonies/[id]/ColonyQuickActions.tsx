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

const SUBMIT_LABELS: Record<ActionType, string> = {
  inspection:    'Durchsicht buchen',
  feeding:       'Fütterung buchen',
  varroa:        'Behandlung buchen',
  honey_harvest: 'Honigernte buchen',
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

export function ColonyQuickActions({ colonyId }: Props) {
  const router = useRouter()
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [inspectionForm, setInspectionForm] = useState<InspectionForm>(EMPTY_INSPECTION)
  const [feedingForm, setFeedingForm] = useState<FeedingForm>(EMPTY_FEEDING)
  const [honigernteForm, setHonigernteForm] = useState<HonigernteForm>(EMPTY_HONIGERNTE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleAction(action: ActionType) {
    setActiveAction(prev => prev === action ? null : action)
  }

  async function submit() {
    if (!activeAction) return
    setLoading(true)
    setError(null)
    try {
      let res!: Response
      if (activeAction === 'inspection') {
        res = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colonyId, items: buildItems(inspectionForm) }),
        })
      } else if (activeAction === 'feeding') {
        res = await fetch('/api/treatments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colonyId, type: 'feeding',
            amount: feedingForm.amount, unit: 'kg', notes: feedingForm.foodType,
          }),
        })
      } else if (activeAction === 'varroa') {
        res = await fetch('/api/treatments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colonyId, type: 'varroa' }),
        })
      } else {
        res = await fetch('/api/treatments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colonyId, type: 'honey_harvest',
            amount: honigernteForm.zargen, unit: 'Zargen',
          }),
        })
      }
      if (!res.ok) {
        setError('Fehler beim Buchen. Bitte erneut versuchen.')
        return
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
          <>
            <button
              onClick={submit}
              disabled={loading}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[14px] font-semibold transition-colors"
            >
              {loading ? 'Wird gebucht…' : SUBMIT_LABELS[activeAction]}
            </button>
            {error && (
              <p className="mt-2 text-[13px] text-rose-600 text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
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
      aria-pressed={active}
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
  const dec = () => onChange({ ...value, amount: Math.max(0.5, Math.round((value.amount - 0.5) * 10) / 10) })
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
