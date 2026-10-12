'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DecimalInput } from '@/components/DecimalInput'
import {
  calcSalbe, switchSalbeMode, salbeWarnings, formatGrams, formatNumber,
  DEFAULT_SALBE_INPUT, FIRMNESS_OPTIONS, RESIN_OPTIONS, SalbeInput, SalbeMode,
} from '@/lib/rezepte/salbe'

const STORAGE_KEY = 'rezept-salbe-v1'

const STEPS: { title: string; temp?: string; text: string }[] = [
  { title: 'Propolis eindampfen', temp: '50–60 °C', text: 'Tinktur in ein Schraubglas geben und offen im Wasserbad stehen lassen, bis nach 30–60 Minuten eine zähe, honigartige Paste übrig ist. Gelegentlich umrühren.' },
  { title: 'In Lanolin lösen', temp: 'ca. 60 °C', text: 'Lanolin direkt zur Propolis-Paste ins Glas geben und gründlich verrühren, bis keine Klümpchen mehr da sind.' },
  { title: 'Zirbenharz in Shea lösen', temp: '75–80 °C', text: 'Harz im Gefrierfach spröde werden lassen, grob zerkleinern und mit der Shea Butter 30–45 Minuten im Wasserbad halten. Das verhindert gleichzeitig, dass die Shea später körnig wird. Ohne Harz die Shea 15–20 Minuten bei 70–75 °C halten.' },
  { title: 'Abseihen', text: 'Heiße Shea-Harz-Mischung durch Kaffeefilter oder Baumwolltuch im Sieb gießen. Filter danach wegwerfen.' },
  { title: 'Wachs dazu', temp: 'ca. 70 °C', text: 'Bienenwachs separat schmelzen (Schmelzpunkt 62–64 °C) und mit der abgeseihten Shea-Mischung verrühren.' },
  { title: 'Propolis-Lanolin einrühren', text: 'Vom Herd nehmen und gründlich rühren, bis alles gleichmäßig ist. Bei ca. 50 °C das Vitamin E zugeben.' },
  { title: 'Löffeltest', text: 'Etwas Salbe auf einen kalten Teller geben und 2–3 Minuten in den Kühlschrank stellen. Zu weich: etwas Wachs nachschmelzen. Zu fest: etwas Shea oder Lanolin dazu.' },
  { title: 'Abfüllen und schnell kühlen', text: 'In Glas- oder Alutiegel füllen und 1–2 Stunden in den Kühlschrank stellen. Danach kühl und dunkel lagern, Haltbarkeit etwa 12 Monate.' },
]

const TOOLS = [
  'Alte Schraub- oder Weckgläser zum Schmelzen',
  'Edelstahllöffel oder Holzstäbchen zum Rühren',
  'Kaffeefilter oder Baumwolltuch zum Abseihen',
  'Kein Kunststoff oder Silikon, das verfärbt und bleibt klebrig',
]

const CLEANING = [
  'Noch warm mit Küchenpapier auswischen',
  'Reste mit 97 %igem Alkohol oder Speiseöl lösen',
  'Erst danach heiß mit Spülmittel abwaschen',
  'Hartnäckiges einfrieren und spröde abplatzen lassen',
]

const inputClass = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent'

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

export default function PropolisZirbensalbePage() {
  const [input, setInput] = useState<SalbeInput>(DEFAULT_SALBE_INPUT)
  const [restored, setRestored] = useState(false)

  // Letzte Eingaben aus dem Browser laden (erst nach Hydration, sonst SSR-Mismatch)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setInput({ ...DEFAULT_SALBE_INPUT, ...saved })
    } catch { /* ungültiger Speicherstand → Standardwerte */ }
    setRestored(true)
  }, [])

  useEffect(() => {
    if (restored) localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
  }, [input, restored])

  const set = <K extends keyof SalbeInput>(key: K, value: SalbeInput[K]) => setInput(prev => ({ ...prev, [key]: value }))

  const r = calcSalbe(input)
  const warnings = salbeWarnings(input, r)

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/rezepte" className="text-[12px] font-medium text-amber-600 hover:text-amber-700">← Rezepte · Salben</Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mt-1">Propolis-Zirbensalbe</h1>
        <p className="text-zinc-500 text-[14px] mt-1 max-w-2xl">
          Feste, aber gut streichbare Salbe auf Shea-Basis mit eigenem Bienenwachs, Propolis und Zirbenharz. Gib die Shea-Menge oder die gewünschte Gesamtmenge ein, alle anderen Zutaten werden mitgerechnet.
        </p>
      </div>

      {/* Rechner */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Rechnen nach</label>
            <Segmented<SalbeMode>
              options={[{ label: 'Shea Butter', value: 'shea' }, { label: 'Gesamtmenge Salbe', value: 'total' }]}
              value={input.mode}
              onChange={m => setInput(prev => switchSalbeMode(prev, m))}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">
              {input.mode === 'shea' ? 'Shea Butter' : 'Gesamtmenge Salbe'}
            </label>
            <div className="flex items-center gap-2">
              <DecimalInput value={input.amount} onChange={v => set('amount', v)}
                className={`${inputClass} text-[20px] font-semibold`} />
              <span className="text-[14px] text-zinc-400">g</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Festigkeit (Bienenwachs je 250 g Shea)</label>
            <Segmented options={FIRMNESS_OPTIONS.map(o => ({ label: o.label, sub: `${o.grams} g`, value: o.grams }))}
              value={input.waxPer250} onChange={v => set('waxPer250', v)} />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Zirbenharz (je 250 g Shea)</label>
            <Segmented options={RESIN_OPTIONS.map(o => ({ label: o.label, sub: `${o.grams} g`, value: o.grams }))}
              value={input.resinPer250} onChange={v => set('resinPer250', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-zinc-500 mb-1">Tinktur-Stärke</label>
              <div className="flex items-center gap-2">
                <DecimalInput value={input.tinctureStrengthPct} onChange={v => set('tinctureStrengthPct', v)} className={inputClass} />
                <span className="text-[13px] text-zinc-400 whitespace-nowrap">% Propolis</span>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-zinc-500 mb-1">Propolis in Salbe</label>
              <div className="flex items-center gap-2">
                <DecimalInput value={input.propolisPct} onChange={v => set('propolisPct', v)} className={inputClass} />
                <span className="text-[13px] text-zinc-400">%</span>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-zinc-400">
            Sinnvoll sind 2–3 % Propolis, mehr als 5 % macht die Salbe klebrig und erhöht das Allergierisiko.
          </p>
        </div>

        {/* Ergebnis */}
        <div className="bg-white rounded-2xl shadow-sm p-5" aria-live="polite">
          <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
            <h2 className="text-[16px] font-semibold text-zinc-900">Dein Ansatz</h2>
            <p className="text-[13px] text-zinc-500">
              ca. <span className="text-[20px] font-semibold text-amber-700 tabular-nums">{formatNumber(r.totalG)}</span> g Salbe
            </p>
          </div>
          <Row name="Shea Butter" role="Basis, pflegend" value={formatGrams(r.sheaG)} />
          {input.resinPer250 > 0 && <Row name="Zirbenharz" role="in Shea lösen und abseihen" value={formatGrams(r.resinG)} />}
          <Row name="Bienenwachs" role="Festigkeit" value={formatGrams(r.waxG)} />
          <Row name="Lanolin" role="Geschmeidigkeit, löst die Propolis" value={formatGrams(r.lanolinG)} />
          <Row name="Propolis-Tinktur"
            role={`eingedampft, bei ${formatNumber(input.tinctureStrengthPct, input.tinctureStrengthPct % 1 ? 1 : 0)} % ca. ${formatGrams(r.propolisG)} Propolis`}
            value={`${formatNumber(r.tinctureMl)} ml`} />
          <Row name="Vitamin E Öl" role="ca. 1 %, Oxidationsschutz" value={formatGrams(r.vitaminEG)} />

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[12px] px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">ca. {formatNumber(r.jars)} Tiegel à 30 ml</span>
            <span className="text-[12px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Wachsanteil {formatNumber(r.waxPct, 1)} %</span>
            {warnings.map(w => (
              <span key={w} className="text-[12px] px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">⚠ {w}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Herstellung & Hinweise */}
      <div className="grid md:grid-cols-[3fr_2fr] gap-4 mt-4 items-start">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-[16px] font-semibold text-zinc-900 mb-4">Herstellung</h2>
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-amber-50 text-amber-700 text-[13px] font-semibold flex items-center justify-center">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-zinc-900">
                    {s.title}
                    {s.temp && <span className="ml-2 text-[12px] font-medium text-amber-600 whitespace-nowrap">{s.temp}</span>}
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
              <li>Der Alkohol ist hochentzündlich: nur Wasserbad, keine offene Flamme, gut lüften.</li>
              <li>Propolis und Baumharz können Kontaktallergien auslösen. Vor der ersten Anwendung 24 Stunden in der Armbeuge testen.</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-[14px] font-semibold text-zinc-900">Gefäße und Werkzeug</h3>
            <ul className="list-disc pl-4 mt-2 space-y-1.5 text-[13px] text-zinc-600">
              {TOOLS.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-[14px] font-semibold text-zinc-900">Reinigung</h3>
            <ul className="list-disc pl-4 mt-2 space-y-1.5 text-[13px] text-zinc-600">
              {CLEANING.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-zinc-400 mt-4">
        Mengenangaben bei Tinktur in ml unter der Annahme von ca. 1 g/ml. Ein Teil des Harzes bleibt beim Abseihen im Filter, die Gesamtmenge ist daher ein Richtwert.
      </p>
    </div>
  )
}
