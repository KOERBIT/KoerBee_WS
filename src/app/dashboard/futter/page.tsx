'use client'

import { useState, useEffect, useCallback } from 'react'
import { DecimalInput } from '@/components/DecimalInput'
import {
  FEED_PRESETS, BUCKET_PRESETS, FRAME_PRESETS,
  recipeForBucket, recipeForTargetWeight, dissolveFondant,
  invertinMl, bucketsNeeded, batchCost, bucketKgToLiters,
  foodFromWeight, dryWeight, frameCapacityKg, seasonalFeedingAdvice, Recipe, FeedingAdvice,
} from '@/lib/feed/calc'

type Tab = 'sirup' | 'teig' | 'vorrat'
interface Colony { id: string; name: string; apiary: { name: string } | null }

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const nf = (n: number, d = 1) => (Number.isFinite(n) ? n : 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: d })
const eur = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
const round1 = (n: number) => Math.round(n * 10) / 10

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? 'bg-amber-50' : 'bg-zinc-50'}`}>
      <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className={`text-[17px] font-semibold ${accent ? 'text-amber-700' : 'text-zinc-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function LabeledInput({ label, value, onChange, suffix, min = 0 }: {
  label: string; value: number; onChange: (n: number) => void; suffix?: string; min?: number
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-zinc-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <DecimalInput value={value} onChange={onChange} min={min}
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
        {suffix && <span className="text-[13px] text-zinc-400 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  )
}

export default function FutterPage() {
  const [tab, setTab] = useState<Tab>('sirup')
  const [feedKey, setFeedKey] = useState<'sommer' | 'winter'>('winter')
  const ratio = FEED_PRESETS.find(p => p.key === feedKey)!.ratio
  const feedLabel = FEED_PRESETS.find(p => p.key === feedKey)!.label

  // Gemeinsame Parameter
  const [invertinDose, setInvertinDose] = useState(3)
  const [sugarPrice, setSugarPrice] = useState(0)
  const [invertinPrice, setInvertinPrice] = useState(0)

  // Sirup-Tab
  const [sirupMode, setSirupMode] = useState<'bucket' | 'menge'>('bucket')
  const [bucketUnit, setBucketUnit] = useState<'kg' | 'l'>('kg')
  const [bucketValue, setBucketValue] = useState(12.5)
  const bucketL = bucketUnit === 'l' ? bucketValue : bucketKgToLiters(bucketValue)
  const [headroom, setHeadroom] = useState(15)
  const [perVolkKg, setPerVolkKg] = useState(10)
  const [anzahl, setAnzahl] = useState(1)

  // Teig-Tab
  const [fondantKg, setFondantKg] = useState(5)
  const [sugarPct, setSugarPct] = useState(90)

  // Vorrat-Tab (Federwaage)
  const [frameKey, setFrameKey] = useState('zander')
  const [zargen, setZargen] = useState(2)
  const [framesPerZarge, setFramesPerZarge] = useState(10)
  const [emptyCombKg, setEmptyCombKg] = useState(0.5)
  const [foodPerFullKg, setFoodPerFullKg] = useState(2.0)
  const [taraKg, setTaraKg] = useState(7)
  const [beesKg, setBeesKg] = useState(1.5)
  const [targetFoodKg, setTargetFoodKg] = useState(18)
  const [weighMode, setWeighMode] = useState<'total' | 'kipp'>('total')
  const [weightTotal, setWeightTotal] = useState(40)
  const [weightFront, setWeightFront] = useState(0)
  const [weightBack, setWeightBack] = useState(0)
  const [vbAnzahl, setVbAnzahl] = useState(1)
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)

  // Fütterung buchen
  const [colonies, setColonies] = useState<Colony[]>([])
  const [selectedColonies, setSelectedColonies] = useState<Set<string>>(new Set())
  const [bookDate, setBookDate] = useState(new Date().toISOString().slice(0, 10))
  const [bookAmount, setBookAmount] = useState(0)
  const [bookNote, setBookNote] = useState('')
  const [booking, setBooking] = useState(false)
  const [bookMsg, setBookMsg] = useState<string | null>(null)
  const [showBooking, setShowBooking] = useState(false)

  const loadColonies = useCallback(async () => {
    const res = await fetch('/api/colonies')
    if (res.ok) setColonies(await res.json())
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadColonies() }, [loadColonies])

  function selectFrame(key: string) {
    setFrameKey(key)
    const f = FRAME_PRESETS.find(p => p.key === key)
    if (f) {
      setFramesPerZarge(f.defaultFrames)
      setEmptyCombKg(f.emptyCombKg)
      setFoodPerFullKg(f.foodPerFullKg)
      setTaraKg(round1(f.boxTareKg * zargen + 2))
      setTargetFoodKg(f.targetFoodKg)
    }
  }

  // --- Sirup / Teig: Rezept ---
  let recipe: Recipe = { sugarKg: 0, waterL: 0, weightKg: 0, volumeL: 0, densityKgL: 0 }
  let addWaterL: number | null = null
  let perColonyKg = 0
  let count = 1
  if (tab === 'sirup') {
    if (sirupMode === 'bucket') {
      recipe = recipeForBucket(bucketL, headroom, ratio)
      perColonyKg = recipe.weightKg
    } else {
      count = Math.max(1, Math.round(anzahl))
      recipe = recipeForTargetWeight(perVolkKg * count, ratio)
      perColonyKg = perVolkKg
    }
  } else if (tab === 'teig') {
    const f = dissolveFondant(fondantKg, sugarPct, ratio)
    recipe = { sugarKg: f.sugarKg, waterL: f.addWaterL, weightKg: f.weightKg, volumeL: f.volumeL, densityKgL: f.volumeL > 0 ? f.weightKg / f.volumeL : 0 }
    addWaterL = f.addWaterL
    perColonyKg = f.weightKg
  }
  const invMl = invertinMl(recipe.sugarKg, invertinDose)
  const cost = batchCost(recipe.sugarKg, sugarPrice, invMl, invertinPrice)
  const buckets = tab === 'sirup' && sirupMode === 'bucket' ? 1 : bucketsNeeded(recipe.volumeL, bucketL, headroom)

  // --- Vorrat prüfen ---
  const totalFrames = Math.max(0, Math.round(zargen * framesPerZarge))
  const measured = weighMode === 'total' ? weightTotal : weightFront + weightBack
  const dryTotal = dryWeight(taraKg, totalFrames, emptyCombKg, beesKg)
  const food = foodFromWeight(measured, dryTotal)
  const capacity = frameCapacityKg(totalFrames, foodPerFullKg)
  const fullFramesEq = foodPerFullKg > 0 ? food / foodPerFullKg : 0
  const deficit = Math.max(0, targetFoodKg - food)
  const advice: FeedingAdvice = seasonalFeedingAdvice(month, deficit)

  function openBooking(amount: number, note: string) {
    setBookAmount(round1(amount))
    setBookNote(note)
    setBookMsg(null)
    setShowBooking(true)
  }

  function applyAdvice() {
    if (advice.form === 'fluessig') {
      setFeedKey(advice.ratioKey)
      setSirupMode('menge')
      setPerVolkKg(round1(deficit))
      setAnzahl(Math.max(1, Math.round(vbAnzahl)))
      setTab('sirup')
    } else if (advice.form === 'teig') {
      openBooking(deficit, `Futterteig aufgelegt (${MONTHS[month - 1]})`)
    }
  }

  function toggleColony(id: string) {
    setSelectedColonies(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function bookFeeding() {
    if (selectedColonies.size === 0) { setBookMsg('Bitte mindestens ein Volk wählen.'); return }
    setBooking(true); setBookMsg(null)
    const ids = [...selectedColonies]
    const results = await Promise.all(ids.map(colonyId =>
      fetch('/api/treatments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colonyId, type: 'feeding', amount: bookAmount, unit: 'kg', date: bookDate, notes: bookNote }),
      }).then(r => r.ok)))
    setBooking(false)
    const ok = results.filter(Boolean).length
    if (ok === ids.length) {
      setBookMsg(`✓ Fütterung für ${ok} Volk${ok > 1 ? '/Völker' : ''} gebucht (${nf(bookAmount)} kg je Volk).`)
      setSelectedColonies(new Set())
    } else {
      setBookMsg(`Nur ${ok} von ${ids.length} gebucht – bitte erneut versuchen.`)
    }
  }

  const bookNoteForRecipe = tab === 'teig' ? `Aufgelöster Futterteig (${feedLabel})` : `Zuckerwasser (${feedLabel})`

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Futtermittel</h1>
        <p className="text-zinc-500 text-[14px] mt-1">Flüssigfutter & Futterteig berechnen, Vorrat prüfen und buchen</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-4 overflow-x-auto">
        {([['sirup', 'Flüssigfutter'], ['teig', 'Futterteig auflösen'], ['vorrat', 'Vorrat prüfen']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Futterart (nur für Rezept-Tabs) */}
      {tab !== 'vorrat' && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <label className="block text-[12px] font-medium text-zinc-500 mb-2">Futterart (Zucker:Wasser nach Gewicht)</label>
          <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
            {FEED_PRESETS.map(p => (
              <button key={p.key} onClick={() => setFeedKey(p.key)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${feedKey === p.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-zinc-400 mt-2">{FEED_PRESETS.find(p => p.key === feedKey)!.hint}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Eingaben */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          {tab === 'sirup' && (
            <>
              <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
                {([['bucket', 'Nach Eimer'], ['menge', 'Nach Menge / Völker']] as [typeof sirupMode, string][]).map(([m, l]) => (
                  <button key={m} onClick={() => setSirupMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${sirupMode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>{l}</button>
                ))}
              </div>
              {sirupMode === 'bucket' ? (
                <>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-500 mb-1">Eimergröße</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {BUCKET_PRESETS.map(b => (
                        <button key={b.kg} onClick={() => { setBucketUnit('kg'); setBucketValue(b.kg) }}
                          className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors ${bucketUnit === 'kg' && bucketValue === b.kg ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                          {nf(b.kg)} kg
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <DecimalInput value={bucketValue} onChange={setBucketValue}
                        className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                      <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5 shrink-0">
                        {(['kg', 'l'] as const).map(u => (
                          <button key={u} onClick={() => setBucketUnit(u)}
                            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${bucketUnit === u ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
                            {u === 'kg' ? 'kg' : 'Liter'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {bucketUnit === 'kg' && <p className="text-[11px] text-zinc-400 mt-1">kg-Eimer (Honig) ≈ {nf(bucketL, 1)} L Volumen</p>}
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-500 mb-1">Rührreserve: {nf(headroom)} %</label>
                    <input type="range" min={0} max={40} step={5} value={headroom}
                      onChange={e => setHeadroom(Number(e.target.value))} className="w-full accent-amber-500" />
                    <p className="text-[11px] text-zinc-400">Platz zum Rühren – bleibt im Eimer frei.</p>
                  </div>
                </>
              ) : (
                <>
                  <LabeledInput label="Menge je Volk" value={perVolkKg} onChange={setPerVolkKg} suffix="kg" />
                  <LabeledInput label="Anzahl Völker" value={anzahl} onChange={setAnzahl} suffix="Völker" min={1} />
                  <LabeledInput label="Eimergröße (für Anzahl Eimer)" value={bucketValue} onChange={setBucketValue} suffix={bucketUnit === 'kg' ? 'kg' : 'Liter'} />
                </>
              )}
            </>
          )}

          {tab === 'teig' && (
            <>
              <LabeledInput label="Menge Futterteig" value={fondantKg} onChange={setFondantKg} suffix="kg" />
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Zuckergehalt des Teigs: {nf(sugarPct)} %</label>
                <input type="range" min={70} max={100} step={1} value={sugarPct}
                  onChange={e => setSugarPct(Number(e.target.value))} className="w-full accent-amber-500" />
                <p className="text-[11px] text-zinc-400">Futterteig/Fondant ist meist ~90 % Zucker.</p>
              </div>
              <p className="text-[12px] text-zinc-500 bg-zinc-50 rounded-lg p-3">
                Ziel: <b>{feedLabel}</b>. Der Teig wird mit Wasser zu Flüssigfutter aufgelöst.
              </p>
            </>
          )}

          {tab === 'vorrat' && (
            <>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Zargenart</label>
                <select value={frameKey} onChange={e => selectFrame(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {FRAME_PRESETS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Anzahl Zargen" value={zargen} onChange={setZargen} suffix="Zargen" min={1} />
                <LabeledInput label="Rähmchen je Zarge" value={framesPerZarge} onChange={setFramesPerZarge} suffix="Stück" min={1} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Tara Beute (ohne Rähmchen)" value={taraKg} onChange={setTaraKg} suffix="kg" />
                <LabeledInput label="Bienenmasse" value={beesKg} onChange={setBeesKg} suffix="kg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Leergewicht je Wabe" value={emptyCombKg} onChange={setEmptyCombKg} suffix="kg" />
                <LabeledInput label="Ziel-Futtervorrat" value={targetFoodKg} onChange={setTargetFoodKg} suffix="kg" />
              </div>
              <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
                {([['total', 'Gesamtgewicht'], ['kipp', 'Kippen (vorne+hinten)']] as [typeof weighMode, string][]).map(([m, l]) => (
                  <button key={m} onClick={() => setWeighMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${weighMode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>{l}</button>
                ))}
              </div>
              {weighMode === 'total' ? (
                <LabeledInput label="Gemessenes Gewicht (Federwaage)" value={weightTotal} onChange={setWeightTotal} suffix="kg" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Vorne angehoben" value={weightFront} onChange={setWeightFront} suffix="kg" />
                  <LabeledInput label="Hinten angehoben" value={weightBack} onChange={setWeightBack} suffix="kg" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Monat</label>
                  <select value={month} onChange={e => setMonth(Number(e.target.value))}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <LabeledInput label="Anzahl Völker (buchen)" value={vbAnzahl} onChange={setVbAnzahl} suffix="Völker" min={1} />
              </div>
              <p className="text-[11px] text-zinc-400">
                {totalFrames} Waben gesamt. Tara am besten die leere Beute ohne Rähmchen einmal wiegen. Beim Kippen vorne + hinten anheben und beide Werte eintragen.
              </p>
            </>
          )}

          {/* Zusatz-Parameter (Rezept-Tabs) */}
          {tab !== 'vorrat' && (
            <div className="border-t border-zinc-100 pt-4 space-y-3">
              <LabeledInput label="Invertin-Dosierung" value={invertinDose} onChange={setInvertinDose} suffix="ml / kg Zucker" />
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Zuckerpreis" value={sugarPrice} onChange={setSugarPrice} suffix="€/kg" />
                <LabeledInput label="Invertin-Preis" value={invertinPrice} onChange={setInvertinPrice} suffix="€/L" />
              </div>
            </div>
          )}
        </div>

        {/* Ergebnis */}
        {tab !== 'vorrat' ? (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">Rezept · {feedLabel}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="Zucker" value={`${nf(recipe.sugarKg, 2)} kg`} accent />
              <Stat label={tab === 'teig' ? 'Wasser zugeben' : 'Wasser'} value={`${nf(recipe.waterL, 2)} L`} accent />
              <Stat label="Invertin" value={`${nf(invMl, 0)} ml`} sub={`${nf(invertinDose)} ml/kg · < 45 °C`} />
              <Stat label="Fertigfutter" value={`${nf(recipe.weightKg, 1)} kg`} sub={`≈ ${nf(recipe.volumeL, 1)} L · ${nf(recipe.densityKgL, 2)} kg/L`} />
              {(tab !== 'sirup' || sirupMode === 'menge') && (
                <Stat label="Benötigte Eimer" value={`${buckets}`} sub={`à ${nf(bucketL, 1)} L`} />
              )}
              {(sugarPrice > 0 || invertinPrice > 0) && (
                <Stat label="Materialkosten" value={eur(cost)} sub={count > 1 ? `${eur(cost / count)} je Volk` : undefined} />
              )}
            </div>
            {count > 1 && <p className="text-[12px] text-zinc-500 mt-3">Gesamt für {count} Völker · {nf(perColonyKg)} kg je Volk.</p>}
            <div className="mt-4 bg-zinc-50 rounded-xl p-3 text-[12px] text-zinc-600 leading-relaxed">
              {tab === 'teig' ? (
                <>Teig mit <b>{nf(recipe.waterL, 2)} L</b> warmem Wasser übergießen, quellen lassen und verrühren, bis er gelöst ist.</>
              ) : (
                <><b>{nf(recipe.waterL, 2)} L</b> Wasser {feedKey === 'winter' ? 'warm' : '(ca. 20 °C)'} vorlegen, <b>{nf(recipe.sugarKg, 2)} kg</b> Zucker einrühren bis klar gelöst.</>
              )}{' '}
              Erst wenn die Mischung <b>unter 45 °C</b> ist, <b>{nf(invMl, 0)} ml</b> Invertin einrühren.
            </div>
            <button onClick={() => openBooking(addWaterL !== null ? recipe.weightKg : perColonyKg, bookNoteForRecipe)}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
              Fütterung buchen
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">Ergebnis · {MONTHS[month - 1]}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="Gemessen" value={`${nf(measured, 1)} kg`} sub={weighMode === 'kipp' ? 'vorne + hinten' : undefined} />
              <Stat label="Leergewicht" value={`${nf(dryTotal, 1)} kg`} sub={`Tara + ${totalFrames} Waben + Bienen`} />
              <Stat label="Futter (geschätzt)" value={`${nf(food, 1)} kg`} sub={`≈ ${nf(fullFramesEq, 1)} volle Waben`} accent />
              <Stat label="Kapazität" value={`${nf(capacity, 0)} kg`} sub={`${totalFrames} Waben voll`} />
            </div>
            <div className={`mt-3 rounded-xl p-4 ${advice.enough ? 'bg-green-50' : 'bg-amber-50'}`}>
              {advice.enough ? (
                <p className="text-[14px] font-semibold text-green-700">✓ Vorrat reicht (~{nf(food, 1)} kg, Ziel {nf(targetFoodKg)} kg)</p>
              ) : (
                <>
                  <p className="text-[14px] font-semibold text-amber-800">Es fehlen ~{nf(deficit, 1)} kg Futter je Volk</p>
                  <p className="text-[13px] font-medium text-zinc-800 mt-1">Empfehlung: {advice.title}</p>
                  <p className="text-[12px] text-zinc-500 mt-0.5">{advice.reason}</p>
                </>
              )}
            </div>
            {!advice.enough && (
              <button onClick={applyAdvice}
                className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {advice.form === 'fluessig' ? `→ Flüssigfutter berechnen (${nf(deficit, 1)} kg/Volk)` : `Als Futterteig buchen (${nf(deficit, 1)} kg/Volk)`}
              </button>
            )}
            <p className="text-[11px] text-zinc-400 mt-3">Richtwerte – Leergewicht/Ziel je nach Beute anpassen. Näherung: benötigter Zucker ≈ fehlender Vorrat.</p>
          </div>
        )}
      </div>

      {/* Modal: Fütterung buchen */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Fütterung buchen</h2>
                <p className="text-[12px] text-zinc-400 mt-0.5">Wird je Volk als Fütterung (Behandlung) gespeichert</p>
              </div>
              <button onClick={() => setShowBooking(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Menge je Volk" value={bookAmount} onChange={setBookAmount} suffix="kg" />
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Datum</label>
                  <input type="date" value={bookDate} onChange={e => setBookDate(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Notiz</label>
                <input value={bookNote} onChange={e => setBookNote(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Völker ({selectedColonies.size} gewählt)</label>
                {colonies.length === 0 ? (
                  <p className="text-[12px] text-zinc-400">Keine Völker gefunden.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-zinc-100 rounded-xl divide-y divide-zinc-50">
                    {colonies.map(c => (
                      <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-zinc-50">
                        <input type="checkbox" checked={selectedColonies.has(c.id)} onChange={() => toggleColony(c.id)}
                          className="w-4 h-4 accent-amber-500" />
                        <span className="text-[13px] text-zinc-800">{c.name}</span>
                        {c.apiary && <span className="text-[11px] text-zinc-400 ml-auto">{c.apiary.name}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {bookMsg && <p className={`text-[12px] font-medium ${bookMsg.startsWith('✓') ? 'text-green-600' : 'text-rose-600'}`}>{bookMsg}</p>}
              <div className="flex gap-3">
                <button onClick={bookFeeding} disabled={booking || selectedColonies.size === 0}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[13px] font-semibold transition-colors">
                  {booking ? 'Wird gebucht…' : `Für ${selectedColonies.size || ''} Volk/Völker buchen`}
                </button>
                <button onClick={() => setShowBooking(false)}
                  className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
