'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DecimalInput } from '@/components/DecimalInput'
import {
  calcOelauszug, oelauszugWarnings, DEFAULT_OELAUSZUG_INPUT,
  USE_CASE_OPTIONS, OIL_SHARE_OPTIONS,
  type OelauszugInput,
} from '@/lib/rezepte/propolis-oelauszug'

const STORAGE_KEY = 'rezept-oelauszug-v1'

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

const OIL_STEPS = [
  { title: 'Propolis zerkleinern', text: 'Rohpropolis einfrieren und fein reiben oder im Mörser zerkleinern. Große Stücke lösen sich im Öl schlecht.' },
  { title: 'Öl erwärmen', temp: '50–60 °C', text: 'Trägeröl im Wasserbad langsam auf 50–60 °C erwärmen. Nicht über 70 °C – das zerstört wertvolle Ölbestandteile.' },
  { title: 'Propolis einrühren', text: 'Zerkleinerte Propolis ins warme Öl geben und gut umrühren. Glas verschließen.' },
  { title: 'Warmmazeration', temp: '50–60 °C', text: '2–4 Stunden im Wasserbad bei 50–60 °C halten. Alternativ: 4–6 Wochen kalt mazerieren (täglich schütteln).' },
  { title: 'Abseihen', text: 'Durch Kaffeefilter oder feines Tuch filtern. Der fertige Ölauszug ist klar und goldbraun.' },
  { title: 'Lagern', text: 'In dunkle Glasflasche füllen. Kühl gelagert 6–12 Monate haltbar. Vitamin-E-Tropfen verlängern die Haltbarkeit.' },
]

const SHAMPOO_STEPS = [
  { title: 'Tensid-Basis vorbereiten', text: 'Milde Tensid-Basis (z. B. Coco-Glucosid oder fertige Naturkosmetik-Shampoo-Basis) in ein Gefäß geben.' },
  { title: 'Propolis-Ölauszug einrühren', text: 'Den abgeseihten Ölauszug langsam unter ständigem Rühren in die Tensid-Basis einarbeiten. Nicht schütteln – das schäumt zu stark.' },
  { title: 'Honig hinzufügen', text: 'Optional: Honig (ca. 1 TL pro 100 ml) in wenig warmem Wasser lösen und einrühren. Verleiht Glanz und pflegt.' },
  { title: 'Vitamin E zugeben', text: 'Vitamin-E-Tropfen als Antioxidans einrühren. Verlängert die Haltbarkeit.' },
  { title: 'Abfüllen', text: 'In Pump- oder Quetschflasche füllen. Bei Raumtemperatur 3–6 Monate haltbar.' },
]

export default function PropolisOelauszugPage() {
  const [input, setInput] = useState<OelauszugInput>(DEFAULT_OELAUSZUG_INPUT)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (saved) setInput({ ...DEFAULT_OELAUSZUG_INPUT, ...saved })
    } catch { /* ignore */ }
    setRestored(true)
  }, [])

  useEffect(() => {
    if (restored) localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
  }, [input, restored])

  const set = <K extends keyof OelauszugInput>(key: K, value: OelauszugInput[K]) =>
    setInput(prev => ({ ...prev, [key]: value }))

  const r = calcOelauszug(input)
  const warnings = oelauszugWarnings(input)
  const isProduct = input.useCase !== 'oelauszug'

  const steps = isProduct ? [...OIL_STEPS, ...SHAMPOO_STEPS] : OIL_STEPS

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/rezepte" className="text-[12px] font-medium text-amber-600 hover:text-amber-700">← Rezepte · Kosmetik</Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mt-1">Propolis-Ölauszug</h1>
        <p className="text-zinc-500 text-[14px] mt-1 max-w-2xl">
          Warmmazeration von Propolis in Trägeröl – pur als Pflegeöl oder weiterverarbeitet zu Propolis-Shampoo und Duschgel. Der Rechner berechnet alle Mengen für den Ölauszug und das Endprodukt.
        </p>
      </div>

      {/* Rechner */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Endprodukt</label>
            <Segmented options={[...USE_CASE_OPTIONS]} value={input.useCase} onChange={v => set('useCase', v)} />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Trägeröl-Menge (für den Ölauszug)</label>
            <div className="flex items-center gap-2">
              <DecimalInput value={input.oilMl} onChange={v => set('oilMl', v)}
                className={`${inputClass} text-[20px] font-semibold`} />
              <span className="text-[14px] text-zinc-400">ml</span>
            </div>
            <p className="text-[12px] text-zinc-400 mt-1">Olivenöl, Jojobaöl oder Mandelöl – alle funktionieren.</p>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Propolis-Anteil im Ölauszug</label>
            <div className="flex items-center gap-2">
              <DecimalInput value={input.propolisPct} onChange={v => set('propolisPct', v)} className={inputClass} />
              <span className="text-[13px] text-zinc-400">%</span>
            </div>
            <p className="text-[12px] text-zinc-400 mt-1">5–10 % für Kosmetik, bis 15 % für therapeutische Anwendung.</p>
          </div>

          {isProduct && (
            <>
              <div className="pt-2 border-t border-zinc-100">
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">
                  Gesamtmenge {input.useCase === 'shampoo' ? 'Shampoo' : 'Duschgel'}
                </label>
                <div className="flex items-center gap-2">
                  <DecimalInput value={input.totalProductMl} onChange={v => set('totalProductMl', v)}
                    className={`${inputClass} text-[18px] font-semibold`} />
                  <span className="text-[14px] text-zinc-400">ml</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Ölauszug-Anteil im Produkt</label>
                <Segmented options={[...OIL_SHARE_OPTIONS]} value={input.oilSharePct} onChange={v => set('oilSharePct', v)} />
              </div>
            </>
          )}
        </div>

        {/* Ergebnis */}
        <div className="bg-white rounded-2xl shadow-sm p-5" aria-live="polite">
          {/* Teil 1: Ölauszug */}
          <h2 className="text-[16px] font-semibold text-zinc-900 mb-2">Ölauszug</h2>
          <Row name="Rohpropolis" role="zerkleinert (gefroren reiben)" value={`${fmt(r.propolisG)} g`} />
          <Row name="Trägeröl" role="Oliven-, Jojoba- oder Mandelöl" value={`${fmt(r.oilMl, 0)} ml`} />
          <div className="mt-2 p-3 rounded-xl bg-amber-50">
            <p className="text-[13px] font-medium text-amber-800">
              Ergibt ca. {fmt(r.oilAuszugMl, 0)} ml Propolis-Ölauszug ({input.propolisPct} %)
            </p>
          </div>

          {/* Teil 2: Endprodukt */}
          {isProduct && (
            <>
              <h2 className="text-[16px] font-semibold text-zinc-900 mt-5 mb-2">
                {input.useCase === 'shampoo' ? 'Shampoo' : 'Duschgel'}
              </h2>
              <Row name="Propolis-Ölauszug" role={`${input.oilSharePct} % Anteil`}
                value={`${fmt((input.oilSharePct / 100) * r.totalMl)} ml`} />
              <Row name="Tensid-Basis" role={input.useCase === 'shampoo' ? 'Milde Shampoo-Basis (Coco-Glucosid)' : 'Milde Duschgel-Basis'}
                value={`${fmt(r.tensidMl, 0)} ml`} />
              <Row name="Honig (optional)" role="in warmem Wasser gelöst, für Glanz" value={`${fmt(r.honeyMl)} ml`} />
              <Row name="Vitamin E" role="Antioxidans, Haltbarkeit" value={`${r.vitaminEDrops} Tropfen`} />

              <div className="mt-2 p-3 rounded-xl bg-green-50">
                <p className="text-[13px] font-medium text-green-800">
                  Ergibt ca. {fmt(r.totalMl, 0)} ml {input.useCase === 'shampoo' ? 'Propolis-Shampoo' : 'Propolis-Duschgel'}
                </p>
                <p className="text-[12px] text-green-600 mt-0.5">
                  ≈ {Math.round(r.totalMl / 250)} Flasche{Math.round(r.totalMl / 250) !== 1 ? 'n' : ''} à 250 ml
                </p>
              </div>
            </>
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

      {/* Herstellung */}
      <div className="grid md:grid-cols-[3fr_2fr] gap-4 mt-4 items-start">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-[16px] font-semibold text-zinc-900 mb-4">
            Herstellung {isProduct ? `(Ölauszug + ${input.useCase === 'shampoo' ? 'Shampoo' : 'Duschgel'})` : '(Ölauszug)'}
          </h2>
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className={`shrink-0 w-7 h-7 rounded-full text-[13px] font-semibold flex items-center justify-center ${
                  i < OIL_STEPS.length ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                }`}>{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-zinc-900">
                    {s.title}
                    {'temp' in s && (s as { temp?: string }).temp && <span className="ml-2 text-[12px] font-medium text-amber-600">{(s as { temp?: string }).temp}</span>}
                  </p>
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
              <li>Propolis kann Kontaktallergien auslösen – bei Erstanwendung Hauttest machen.</li>
              <li>Ölauszug bei empfindlicher Haut mit niedrigem Anteil (5 %) beginnen.</li>
              <li>Nicht bei bekannter Allergie gegen Bienenprodukte verwenden.</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-[14px] font-semibold text-zinc-900">Geeignete Öle</h3>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-[13px] font-medium text-zinc-900">Olivenöl</p>
                <p className="text-[12px] text-zinc-500">Reichhaltig, gute Lösekraft. Ideal für therapeutischen Einsatz und trockene Haare.</p>
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-900">Jojobaöl</p>
                <p className="text-[12px] text-zinc-500">Leicht, zieht schnell ein. Ideal für Shampoo (beschwert das Haar nicht).</p>
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-900">Mandelöl</p>
                <p className="text-[12px] text-zinc-500">Mild und hautfreundlich. Ideal für Duschgel und empfindliche Haut.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-[14px] font-semibold text-zinc-900">Einkaufsliste Tensid-Basis</h3>
            <ul className="list-disc pl-4 mt-2 space-y-1.5 text-[13px] text-zinc-600">
              <li><strong>Coco-Glucosid</strong> – mild, aus Kokosnuss, biologisch abbaubar</li>
              <li><strong>Decyl-Glucosid</strong> – noch milder, ideal für Duschgel</li>
              <li>Alternativ: Fertige Naturkosmetik-Basis ohne Duft (z. B. von Dragonspice, Manske)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
