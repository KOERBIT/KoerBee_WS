'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DecimalInput } from '@/components/DecimalInput'
import {
  calcTinktur, tinkturWarnings, DEFAULT_TINKTUR_INPUT,
  PROPOLIS_PCT_OPTIONS, ALCOHOL_OPTIONS, TARGET_ALCOHOL_OPTIONS,
  type TinkturInput,
} from '@/lib/rezepte/propolis-tinktur'

const STORAGE_KEY = 'rezept-tinktur-v1'

function Segmented<T extends string | number>({ options, value, onChange }: {
  options: readonly { label: string; sub?: string; value: T }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
      {options.map(o => (
        <button key={String(o.value)} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`flex-1 min-w-0 py-1.5 px-2 rounded-lg text-[13px] font-medium transition-colors ${value === o.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
          {o.label}
          {o.sub && <span className="block text-[11px] font-normal text-zinc-400">{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

function Row({ name, role, value }: { name: string; role: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-zinc-100 last:border-0">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-zinc-900">{name}</p>
        <p className="text-[12px] text-zinc-400">{role}</p>
      </div>
      <p className="text-[15px] font-semibold text-zinc-900 tabular-nums whitespace-nowrap">{value}</p>
    </div>
  )
}

function fmt(n: number, d = 1) { return n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }) }

const inputClass = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent'

const STEPS = [
  { title: 'Propolis vorbereiten', text: 'Rohpropolis mindestens 24 Stunden einfrieren, dann im Mörser oder mit einer Reibe fein zerkleinern. Je feiner, desto besser löst es sich.' },
  { title: 'Alkohol verdünnen', text: 'Falls nötig: Ausgangsalkohol mit destilliertem Wasser auf die gewünschte Stärke verdünnen. Immer Alkohol ins Wasser geben, nie umgekehrt.' },
  { title: 'Ansetzen', text: 'Propolis in ein dunkles Schraubglas geben und mit dem Alkohol übergießen. Glas verschließen.' },
  { title: 'Mazeration', text: 'Mindestens 4 Wochen an einem dunklen, zimmerwarmen Ort lagern. Täglich kurz schütteln, damit sich die Wirkstoffe besser lösen.' },
  { title: 'Filtern', text: 'Durch einen Kaffeefilter oder ein feines Baumwolltuch abseihen. Rückstände im Filter können für eine zweite, schwächere Tinktur nochmals angesetzt werden.' },
  { title: 'Abfüllen', text: 'In dunkle Tropfflaschen (30–50 ml) füllen. Kühl und dunkel gelagert ist die Tinktur mindestens 3–5 Jahre haltbar.' },
]

const USES = [
  { title: 'Innerlich', text: '3× täglich 10–20 Tropfen in Wasser, Tee oder auf Zucker. Nicht bei Propolis-Allergie.' },
  { title: 'Mundspülung', text: '20 Tropfen in ein halbes Glas lauwarmes Wasser, bei Zahnfleischentzündungen gurgeln.' },
  { title: 'Hautpflege', text: 'Unverdünnt auf kleine Wunden, Herpes oder unreine Hautstellen tupfen (färbt!).' },
  { title: 'Salbenherstellung', text: 'Tinktur eindampfen und in Salbenrezepte einarbeiten (siehe Propolis-Zirbensalbe).' },
]

export default function PropolisTinkturPage() {
  const [input, setInput] = useState<TinkturInput>(DEFAULT_TINKTUR_INPUT)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (saved) setInput({ ...DEFAULT_TINKTUR_INPUT, ...saved })
    } catch { /* ignore */ }
    setRestored(true)
  }, [])

  useEffect(() => {
    if (restored) localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
  }, [input, restored])

  const set = <K extends keyof TinkturInput>(key: K, value: TinkturInput[K]) =>
    setInput(prev => ({ ...prev, [key]: value }))

  const r = calcTinktur(input)
  const warnings = tinkturWarnings(input)

  const needsDilution = input.alcoholPct !== input.targetAlcoholPct

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/rezepte" className="text-[12px] font-medium text-amber-600 hover:text-amber-700">← Rezepte · Tinkturen</Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mt-1">Propolis-Tinktur</h1>
        <p className="text-zinc-500 text-[14px] mt-1 max-w-2xl">
          Klassischer Alkoholauszug (Mazeration). Gib die gewünschte Propolis-Menge und den Anteil ein – der Rechner berechnet Alkohol, Wasser und Gesamtvolumen. Unterstützt Verdünnung von 96 % Primasprit.
        </p>
      </div>

      {/* Rechner */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Propolis (roh, zerkleinert)</label>
            <div className="flex items-center gap-2">
              <DecimalInput value={input.propolisG} onChange={v => set('propolisG', v)}
                className={`${inputClass} text-[20px] font-semibold`} />
              <span className="text-[14px] text-zinc-400">g</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Propolis-Anteil in der Tinktur</label>
            <Segmented options={[...PROPOLIS_PCT_OPTIONS]} value={input.propolisPct} onChange={v => set('propolisPct', v)} />
            <div className="mt-2 flex items-center gap-2">
              <DecimalInput value={input.propolisPct} onChange={v => set('propolisPct', v)} className={inputClass} />
              <span className="text-[13px] text-zinc-400">%</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Ausgangs-Alkohol</label>
            <Segmented options={[...ALCOHOL_OPTIONS]} value={input.alcoholPct} onChange={v => set('alcoholPct', v)} />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Ziel-Alkoholgehalt</label>
            <Segmented options={[...TARGET_ALCOHOL_OPTIONS]} value={input.targetAlcoholPct} onChange={v => set('targetAlcoholPct', v)} />
            <p className="text-[12px] text-zinc-400 mt-1">
              Empfohlen: 65–70 % für optimale Löslichkeit der Propolis-Harze.
            </p>
          </div>
        </div>

        {/* Ergebnis */}
        <div className="bg-white rounded-2xl shadow-sm p-5" aria-live="polite">
          <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
            <h2 className="text-[16px] font-semibold text-zinc-900">Dein Ansatz</h2>
            <p className="text-[13px] text-zinc-500">
              ca. <span className="text-[20px] font-semibold text-amber-700 tabular-nums">{fmt(r.totalMl)}</span> ml Tinktur
            </p>
          </div>

          <Row name="Propolis (roh)" role="zerkleinert, gefriergetrocknet ideal" value={`${fmt(r.propolisG)} g`} />
          <Row name={`Alkohol ${input.alcoholPct} %`}
            role={needsDilution ? `wird auf ${input.targetAlcoholPct} % verdünnt` : 'unverdünnt verwenden'}
            value={`${fmt(r.alcoholMl)} ml`} />
          {needsDilution && r.waterMl > 0 && (
            <Row name="Dest. Wasser" role="zum Verdünnen des Alkohols" value={`${fmt(r.waterMl)} ml`} />
          )}

          <div className="mt-4 p-3 rounded-xl bg-amber-50">
            <p className="text-[13px] font-medium text-amber-800">Ergebnis</p>
            <p className="text-[12px] text-amber-700 mt-1">
              {fmt(r.totalMl)} ml Tinktur mit {input.propolisPct} % Propolis-Anteil bei {input.targetAlcoholPct} % Alkohol
            </p>
            <p className="text-[12px] text-amber-600 mt-0.5">
              ≈ {Math.round(r.totalMl / 30)} Tropfflaschen à 30 ml
            </p>
          </div>

          {needsDilution && (
            <div className="mt-3 p-3 rounded-xl bg-blue-50">
              <p className="text-[13px] font-medium text-blue-800">Verdünnung</p>
              <p className="text-[12px] text-blue-700 mt-1">
                {fmt(r.alcoholMl)} ml {input.alcoholPct}%-Alkohol + {fmt(r.waterMl)} ml Wasser = {fmt(r.totalMl)} ml bei {input.targetAlcoholPct} %
              </p>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {warnings.map(w => (
                <span key={w} className="text-[12px] px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">⚠ {w}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Herstellung & Anwendung */}
      <div className="grid md:grid-cols-[3fr_2fr] gap-4 mt-4 items-start">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-[16px] font-semibold text-zinc-900 mb-4">Herstellung</h2>
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-amber-50 text-amber-700 text-[13px] font-semibold flex items-center justify-center">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-zinc-900">{s.title}</p>
                  <p className="text-[13px] text-zinc-600 mt-0.5">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 rounded-2xl p-5">
            <h3 className="text-[14px] font-semibold text-red-800">Sicherheit</h3>
            <ul className="list-disc pl-4 mt-2 space-y-1.5 text-[13px] text-red-900/80">
              <li>96 % Alkohol ist leichtentzündlich – keine offene Flamme, gut lüften.</li>
              <li>Propolis kann Kontaktallergien auslösen. Vor der ersten Anwendung Hauttest machen (24 h Armbeuge).</li>
              <li>Nicht für Kinder unter 3 Jahren, nicht bei bekannter Bienenprodukt-Allergie.</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-[14px] font-semibold text-zinc-900">Anwendung</h3>
            <div className="mt-2 space-y-3">
              {USES.map(u => (
                <div key={u.title}>
                  <p className="text-[13px] font-medium text-zinc-900">{u.title}</p>
                  <p className="text-[12px] text-zinc-500 mt-0.5">{u.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-[14px] font-semibold text-zinc-900">Tipps</h3>
            <ul className="list-disc pl-4 mt-2 space-y-1.5 text-[13px] text-zinc-600">
              <li>Dunkle Glasflaschen verwenden – UV-Licht zerstört Wirkstoffe.</li>
              <li>Propolis färbt stark! Handschuhe und alte Kleidung tragen.</li>
              <li>Rückstände am Glas mit 96 % Alkohol oder Nagellackentferner lösen.</li>
              <li>Qualitätstest: gute Tinktur ist tiefbraun und riecht harzig-herb.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
