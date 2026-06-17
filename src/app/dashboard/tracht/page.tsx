'use client'

import { useState, useEffect, useCallback } from 'react'
import { PLANTS } from '@/lib/tracht/plants'
import type { ForecastResult } from '@/lib/tracht/types'

interface Apiary { id: string; name: string; lat: number | null; lng: number | null }
interface BloomReport { id: string; plantId: string; plantName: string; phase: string | null; date: string; apiaryId: string | null }

function fmtDate(d: string) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) }

function ratingColor(index: number): string {
  if (index >= 90) return 'bg-green-500'
  if (index >= 75) return 'bg-lime-500'
  if (index >= 50) return 'bg-amber-400'
  if (index >= 25) return 'bg-orange-400'
  return 'bg-zinc-300'
}
function ratingText(index: number): string {
  if (index >= 90) return 'text-green-700'
  if (index >= 75) return 'text-lime-700'
  if (index >= 50) return 'text-amber-700'
  if (index >= 25) return 'text-orange-700'
  return 'text-zinc-500'
}

export default function TrachtPage() {
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [reports, setReports] = useState<BloomReport[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)

  // Melde-Formular
  const [showReport, setShowReport] = useState(false)
  const [repPlant, setRepPlant] = useState(PLANTS[0].id)
  const [repPhase, setRepPhase] = useState('Hochblüte')
  const [repApiary, setRepApiary] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const loadForecast = useCallback(async () => {
    const res = await fetch('/api/tracht')
    if (res.ok) setForecast(await res.json())
    setLoading(false)
  }, [])

  const loadMeta = useCallback(async () => {
    const [a, r] = await Promise.all([
      fetch('/api/apiaries').then(r => r.ok ? r.json() : []),
      fetch('/api/tracht/bloom-reports').then(r => r.ok ? r.json() : []),
    ])
    setApiaries(a)
    setReports(r)
  }, [])

  useEffect(() => { loadForecast(); loadMeta() }, [loadForecast, loadMeta])

  async function saveReport(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/tracht/bloom-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantId: repPlant, phase: repPhase, apiaryId: repApiary || null }),
    })
    setSaving(false)
    setShowReport(false)
    await Promise.all([loadMeta(), loadForecast()])
  }

  async function deleteReport(id: string) {
    await fetch(`/api/tracht/bloom-reports?id=${id}`, { method: 'DELETE' })
    await Promise.all([loadMeta(), loadForecast()])
  }

  if (loading) return (
    <div className="px-8 py-8 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
    </div>
  )

  const loc = forecast?.locations[selected] ?? null

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">🌳 Trachtprognose</h1>
          <p className="text-zinc-500 text-[14px] mt-1">Nektar-Index & 7-Tage-Vorhersage pro Standort</p>
        </div>
        <button onClick={() => setShowReport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Blüte melden
        </button>
      </div>

      {!forecast || forecast.locations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
          <p className="text-[15px] font-medium text-zinc-900">Keine Standorte mit Koordinaten</p>
          <p className="text-[13px] text-zinc-400 mt-1">Hinterlege bei deinen Bienenständen Lat/Lng, dann erscheint hier die Trachtprognose.</p>
        </div>
      ) : (
        <>
          {/* Standort-Tabs */}
          {forecast.locations.length > 1 && (
            <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-6 overflow-x-auto">
              {forecast.locations.map((l, i) => (
                <button key={l.locationId} onClick={() => setSelected(i)}
                  className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${i === selected ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  {l.name}
                </button>
              ))}
            </div>
          )}

          {loc && (
            <div className="space-y-4">
              {loc.warning && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-[13px] text-orange-700 font-medium">
                  ⚠ {loc.warning}
                </div>
              )}

              {/* Aktuelles Wetter + Konfidenz */}
              {loc.currentStatus && (
                <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-semibold text-zinc-900">{loc.currentStatus.temperature}°C</span>
                      <div className="text-[12px] text-zinc-500">
                        <p>{loc.currentStatus.weather}</p>
                        <p>{loc.currentStatus.humidity}% Feuchte · {loc.currentStatus.wind} km/h · {loc.currentStatus.clouds}% Wolken</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-400">Konfidenz</p>
                      <p className="text-[15px] font-semibold text-zinc-900">{Math.round(loc.dataQuality.confidence * 100)}%</p>
                      <p className="text-[10px] text-zinc-400">{loc.dataQuality.weatherDataSource}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Grünlandtemperatursumme / Phänologie */}
              {loc.phenology.gts != null && (
                <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-zinc-400">Grünlandtemperatursumme</p>
                      <p className="text-2xl font-semibold text-zinc-900">{loc.phenology.gts} °C</p>
                      {loc.phenology.vegetationStart && (
                        <p className="text-[11px] text-zinc-400">Vegetationsbeginn (200 °C) am {fmtDate(loc.phenology.vegetationStart)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-400">Saison vs. Mittel</p>
                      <p className={`text-[15px] font-semibold ${loc.phenology.bloomShiftDays < 0 ? 'text-lime-700' : loc.phenology.bloomShiftDays > 0 ? 'text-orange-600' : 'text-zinc-500'}`}>
                        {loc.phenology.bloomShiftDays === 0
                          ? 'im Schnitt'
                          : loc.phenology.bloomShiftDays < 0
                            ? `${Math.abs(loc.phenology.bloomShiftDays)} Tage früher`
                            : `${loc.phenology.bloomShiftDays} Tage später`}
                      </p>
                      <p className="text-[10px] text-zinc-400">Blühzeiten standortkorrigiert</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Empfehlungen */}
              <div className="bg-amber-50 rounded-2xl px-5 py-4">
                <p className="text-[14px] font-semibold text-zinc-900 mb-1">{loc.recommendations.general}</p>
                <p className="text-[13px] text-amber-700 font-medium mb-2">{loc.recommendations.shortTerm}</p>
                <ul className="space-y-1">
                  {loc.recommendations.actionItems.map((item, i) => (
                    <li key={i} className="text-[12px] text-zinc-600 flex gap-1.5"><span className="text-amber-500">✓</span>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Aktuelle Blüten */}
              <h2 className="text-[15px] font-semibold text-zinc-900 mt-6">🌸 Aktuelle Tracht</h2>
              {loc.currentBloom.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm py-10 text-center">
                  <p className="text-[14px] font-medium text-zinc-900">Aktuell keine nennenswerte Tracht</p>
                  <p className="text-[13px] text-zinc-400 mt-1">{loc.seasonalSummary.currentSeason}</p>
                </div>
              ) : loc.currentBloom.map(plant => (
                <div key={plant.plantId} className="bg-white rounded-2xl shadow-sm px-5 py-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-semibold text-zinc-900">{plant.plantName}</span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{plant.bloomPhase}</span>
                        {plant.verified && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ verifiziert</span>}
                      </div>
                      <p className="text-[12px] text-zinc-400 mt-0.5">Nektar: {plant.nectarAmountExpected} · Pollen: {plant.pollenAmountExpected} · noch ca. {plant.bloomDaysLeft} Tage</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${ratingText(plant.nectarIndexToday)}`}>{plant.nectarIndexToday}</p>
                      <p className="text-[11px] text-zinc-400">{plant.nectarRatingToday}</p>
                    </div>
                  </div>

                  {/* Heute-Balken */}
                  <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden my-3">
                    <div className={`h-full ${ratingColor(plant.nectarIndexToday)}`} style={{ width: `${plant.nectarIndexToday}%` }} />
                  </div>
                  <p className="text-[12px] text-zinc-600 mb-3">{plant.explanation} <span className="text-zinc-400">{plant.recommendation}</span></p>

                  {/* 7-Tage-Chart */}
                  <div className="flex items-end gap-1.5 h-28">
                    {plant.forecast7days.map(day => (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.weather}, ${day.temperature}°C – ${day.reason}`}>
                        <span className="text-[10px] font-semibold text-zinc-500">{day.nectarIndex}</span>
                        <div className="w-full bg-zinc-100 rounded-md flex items-end" style={{ height: '70px' }}>
                          <div className={`w-full rounded-md ${ratingColor(day.nectarIndex)}`} style={{ height: `${day.nectarIndex}%` }} />
                        </div>
                        <span className="text-[10px] text-zinc-400">{day.dayOfWeek.slice(0, 2)}</span>
                        <span className="text-[10px] text-zinc-400">{fmtDate(day.date)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Beste Tage */}
                  {plant.bestDaysAhead.length > 0 && (
                    <div className="mt-3 bg-green-50 rounded-xl px-4 py-3">
                      <p className="text-[12px] font-semibold text-green-800">🏆 Beste Tage</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {plant.bestDaysAhead.map(d => (
                          <span key={d} className="text-[11px] font-medium bg-green-600 text-white px-2.5 py-0.5 rounded-full">{fmtDate(d)}</span>
                        ))}
                      </div>
                      <p className="text-[11px] text-green-700/80 mt-1.5">{plant.bestDaysExplanation}</p>
                    </div>
                  )}
                  {plant.warning && <p className="text-[12px] text-orange-600 font-medium mt-2">⚠ {plant.warning}</p>}
                </div>
              ))}

              {/* Kommende Tracht */}
              {loc.nextBloom.length > 0 && (
                <>
                  <h2 className="text-[15px] font-semibold text-zinc-900 mt-6">📅 Kommende Tracht</h2>
                  <div className="bg-white rounded-2xl shadow-sm divide-y divide-zinc-100">
                    {loc.nextBloom.map(plant => (
                      <div key={plant.plantId} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-medium text-zinc-900">{plant.plantName}</p>
                          <p className="text-[12px] text-zinc-400">{plant.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold text-zinc-900">in {plant.daysUntilStart} Tagen</p>
                          <p className="text-[11px] text-zinc-400">ab {fmtDate(plant.estimatedStartDate)} · {plant.expectedNectarLevel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Eigene Imkermeldungen */}
      {reports.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[15px] font-semibold text-zinc-900 mb-2">Meine Blütenmeldungen</h2>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-zinc-100">
            {reports.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-zinc-900">{r.plantName} {r.phase ? `· ${r.phase}` : ''}</p>
                  <p className="text-[11px] text-zinc-400">{fmtDate(r.date)}{r.apiaryId ? ` · ${apiaries.find(a => a.id === r.apiaryId)?.name ?? 'Standort'}` : ''}</p>
                </div>
                <button onClick={() => deleteReport(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Blüte melden */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Blüte melden</h2>
              <button onClick={() => setShowReport(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={saveReport} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Pflanze</label>
                <select value={repPlant} onChange={e => setRepPlant(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {PLANTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Phase</label>
                <select value={repPhase} onChange={e => setRepPhase(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option>Blühbeginn</option><option>Hochblüte</option><option>Abblühend</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Standort (optional)</label>
                <select value={repApiary} onChange={e => setRepApiary(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">Alle Standorte</option>
                  {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[13px] font-semibold transition-colors">
                {saving ? 'Wird gespeichert…' : 'Meldung speichern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
