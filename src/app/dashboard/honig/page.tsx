'use client'

import { useEffect, useState } from 'react'
import { DecimalInput } from '@/components/DecimalInput'
import { calcJars, BUCKET_SIZES_KG } from '@/lib/honey/jars'

const nf = (n: number, d = 1) => (Number.isFinite(n) ? n : 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: d })
const JAR_PRESETS = [125, 250, 500, 1000]
const inputCls = 'w-full border border-zinc-200 rounded-xl px-3 py-2 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent'

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix: string }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-zinc-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <DecimalInput value={value} onChange={onChange} min={0} className={inputCls} />
        <span className="text-[13px] text-zinc-400 whitespace-nowrap">{suffix}</span>
      </div>
    </div>
  )
}

function Result({ title, sub, jars, leftoverG, accent }: { title: string; sub: string; jars: number; leftoverG: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? 'bg-amber-50' : 'bg-zinc-50'}`}>
      <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">{title}</p>
      <p className={`text-[24px] font-semibold ${accent ? 'text-amber-700' : 'text-zinc-900'}`}>{jars} Gläser</p>
      <p className="text-[11px] text-zinc-400">{sub}</p>
      <p className="text-[11px] text-zinc-400">Rest: {nf(leftoverG, 0)} g</p>
    </div>
  )
}

export default function HonigPage() {
  const [jarG, setJarG] = useState(500)
  const [mode, setMode] = useState<'g' | 'pct'>('g')
  const [over, setOver] = useState(10)
  const [under, setUnder] = useState(5)
  const [tares, setTares] = useState<Record<number, number>>({ 20: 0, 25: 0, 40: 0 })
  const [saved, setSaved] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [buckets, setBuckets] = useState<{ sizeKg: number; grossKg: number }[]>([{ sizeKg: 25, grossKg: 0 }])
  const [bucketLossG, setBucketLossG] = useState(200)
  const [vesselLossG, setVesselLossG] = useState(300)

  useEffect(() => {
    fetch('/api/honey/buckets').then(r => (r.ok ? r.json() : [])).then((rows: { sizeKg: number; tareKg: number }[]) => {
      const m: Record<number, number> = {}
      rows.forEach(x => { m[x.sizeKg] = x.tareKg })
      setSaved(m)
      setTares(t => ({ ...t, ...m }))
    }).catch(() => {})
  }, [])

  async function saveTares() {
    setSaving(true); setSaveMsg('')
    try {
      const next: Record<number, number> = {}
      for (const size of BUCKET_SIZES_KG) {
        const res = await fetch('/api/honey/buckets', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sizeKg: size, tareKg: tares[size] ?? 0 }),
        })
        if (!res.ok) throw new Error()
        next[size] = tares[size] ?? 0
      }
      setSaved(next); setSaveMsg('Gespeichert')
    } catch { setSaveMsg('Speichern fehlgeschlagen (Leergewicht muss kleiner als die Eimergröße sein)') }
    setSaving(false)
  }

  const dirty = BUCKET_SIZES_KG.some(sz => (tares[sz] ?? 0) !== (saved[sz] ?? 0))
  const toG = (v: number) => (mode === 'pct' ? (jarG * v) / 100 : v)
  const r = calcJars({ buckets: buckets.map(b => ({ grossKg: b.grossKg, tareKg: tares[b.sizeKg] ?? 0 })), bucketLossG, vesselLossG, jarG, overG: toG(over), underG: toG(under) })
  const patchBucket = (i: number, p: Partial<{ sizeKg: number; grossKg: number }>) => setBuckets(b => b.map((x, j) => (j === i ? { ...x, ...p } : x)))

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-900">Honig abfüllen</h1>
        <p className="text-[13px] text-zinc-500">Wie viele Gläser brauche ich für meinen Honig?</p>
      </div>

      <section className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
        <h2 className="text-[14px] font-semibold text-zinc-800">Glas</h2>
        <div className="flex gap-2 flex-wrap">
          {JAR_PRESETS.map(p => (
            <button key={p} onClick={() => setJarG(p)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium ${jarG === p ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-600'}`}>{p} g</button>
          ))}
        </div>
        <Field label="Glasgröße (Nenninhalt)" value={jarG} onChange={setJarG} suffix="g" />
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {([['g', 'Toleranz in Gramm'], ['pct', 'Toleranz in Prozent']] as [typeof mode, string][]).map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium ${mode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Darf zuviel rein" value={over} onChange={setOver} suffix={mode === 'g' ? 'g' : '%'} />
          <Field label="Darf zuwenig rein" value={under} onChange={setUnder} suffix={mode === 'g' ? 'g' : '%'} />
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
        <h2 className="text-[14px] font-semibold text-zinc-800">Eimer</h2>
        <div>
          <p className="text-[12px] font-medium text-zinc-500 mb-1">Leergewicht je Eimergröße</p>
          <div className="grid grid-cols-3 gap-3">
            {BUCKET_SIZES_KG.map(sz => (
              <Field key={sz} label={`${sz}-kg-Eimer`} value={tares[sz] ?? 0} onChange={v => setTares(t => ({ ...t, [sz]: v }))} suffix="kg" />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={saveTares} disabled={saving || !dirty}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-amber-500 text-white disabled:opacity-40">{saving ? 'Speichert…' : 'Leergewichte speichern'}</button>
            {saveMsg && <span className="text-[12px] text-zinc-500">{saveMsg}</span>}
          </div>
        </div>
        {buckets.map((b, i) => (
          <div key={i} className="flex items-end gap-2">
            <div>
              <label className="block text-[12px] font-medium text-zinc-500 mb-1">Größe</label>
              <select value={b.sizeKg} onChange={e => patchBucket(i, { sizeKg: Number(e.target.value) })} className={inputCls}>
                {BUCKET_SIZES_KG.map(sz => <option key={sz} value={sz}>{sz} kg</option>)}
              </select>
            </div>
            <div className="flex-1"><Field label={`Eimer ${i + 1} mit Honig`} value={b.grossKg} onChange={v => patchBucket(i, { grossKg: v })} suffix="kg" /></div>
            {buckets.length > 1 && (
              <button onClick={() => setBuckets(bs => bs.filter((_, j) => j !== i))}
                className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-500 text-[13px]" aria-label="Eimer entfernen">✕</button>
            )}
          </div>
        ))}
        <button onClick={() => setBuckets(b => [...b, { sizeKg: b[b.length - 1]?.sizeKg ?? 25, grossKg: 0 }])} className="text-[13px] font-medium text-amber-600">+ Eimer hinzufügen</button>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rest je Eimer (bleibt hängen)" value={bucketLossG} onChange={setBucketLossG} suffix="g" />
          <Field label="Rest im Abfüllgefäß" value={vesselLossG} onChange={setVesselLossG} suffix="g" />
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
        <h2 className="text-[14px] font-semibold text-zinc-800">Ergebnis</h2>
        <p className="text-[13px] text-zinc-600">
          Abfüllbarer Honig: <b>{nf(r.netG / 1000, 2)} kg</b> aus {r.buckets} {r.buckets === 1 ? 'Eimer' : 'Eimern'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Result title="Sicher" sub={`je Glas ${nf(r.safe.fillG)} g (mit Zugabe)`} jars={r.safe.jars} leftoverG={r.safe.leftoverG} accent />
          <Result title="Genau" sub={`je Glas ${nf(r.nominal.fillG)} g`} jars={r.nominal.jars} leftoverG={r.nominal.leftoverG} />
          <Result title="Maximal" sub={`je Glas ${nf(r.max.fillG)} g (knapp gefüllt)`} jars={r.max.jars} leftoverG={r.max.leftoverG} />
        </div>
        <p className="text-[11px] text-zinc-400">
          „Sicher“ rechnet mit Zugabe, damit kein Glas unter dem Nenninhalt liegt. „Maximal“ füllt jedes Glas bis zur erlaubten Untergrenze.
        </p>
      </section>
    </div>
  )
}
