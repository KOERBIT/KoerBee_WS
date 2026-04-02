'use client'

import { useState, useEffect, useCallback } from 'react'

const EVENT_LABELS: Record<string, { label: string; day: number; color: string }> = {
  graft:      { label: 'Umlarven',     day: 0,  color: 'bg-violet-100 text-violet-700 border-violet-200' },
  check:      { label: 'Stiftkontrolle', day: 4, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  hatch:      { label: 'Schlupf',      day: 11, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  mating:     { label: 'Begattung',    day: 14, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  laying:     { label: 'Eilage',       day: 21, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  assessment: { label: 'Beurteilung',  day: 28, color: 'bg-green-100 text-green-700 border-green-200' },
}

function PhaseIcon({ type, size = 13 }: { type: string; size?: number }) {
  const s = size
  switch (type) {
    case 'graft': // Larve – kleiner Wurm
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="7" cy="12" rx="5" ry="4"/>
          <path d="M12 12c1-3 4-5 7-4"/>
          <circle cx="20" cy="9" r="1.5" fill="currentColor"/>
        </svg>
      )
    case 'check': // Lupe – Kontrolle
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      )
    case 'hatch': // Schlupf – Kreis bricht auf
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a8 8 0 108 8"/>
          <path d="M16 2l4 4-4 4"/>
          <path d="M20 6h-6"/>
        </svg>
      )
    case 'mating': // Begattung – Flügel
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12C8 8 3 9 3 13s4 5 9 3"/>
          <path d="M12 12c4-4 9-3 9 1s-4 5-9 3"/>
        </svg>
      )
    case 'laying': // Eilage – Wabe mit Punkt
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l4 7H8z"/>
          <path d="M8 9l-5 4 5 4"/>
          <path d="M16 9l5 4-5 4"/>
          <path d="M8 17l4 5 4-5"/>
          <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
        </svg>
      )
    case 'assessment': // Beurteilung – Stern
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      )
    default:
      return null
  }
}

interface BreedingEvent {
  id: string
  type: string
  date: string
  completed: boolean
  notes: string | null
}

interface BreedingBatch {
  id: string
  graftDate: string
  notes: string | null
  status: string
  motherColony: { id: string; name: string } | null
  events: BreedingEvent[]
}

interface BreedingLine {
  id: string
  name: string
  description: string | null
  batches: BreedingBatch[]
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function nextEvent(batch: BreedingBatch): BreedingEvent | null {
  return batch.events.find(e => !e.completed) ?? null
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default function BreedingPage() {
  const [lines, setLines] = useState<BreedingLine[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddLine, setShowAddLine] = useState(false)
  const [lineName, setLineName] = useState('')
  const [lineDesc, setLineDesc] = useState('')
  const [savingLine, setSavingLine] = useState(false)
  const [expandedLine, setExpandedLine] = useState<string | null>(null)
  const [showAddBatch, setShowAddBatch] = useState<string | null>(null)
  const [graftDate, setGraftDate] = useState('')
  const [batchNotes, setBatchNotes] = useState('')
  const [savingBatch, setSavingBatch] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/breeding')
    const data = await res.json()
    setLines(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addLine(e: React.FormEvent) {
    e.preventDefault()
    setSavingLine(true)
    await fetch('/api/breeding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: lineName, description: lineDesc }),
    })
    setSavingLine(false)
    setShowAddLine(false)
    setLineName(''); setLineDesc('')
    load()
  }

  async function deleteLine(id: string) {
    if (!confirm('Zuchtreihe und alle Batches löschen?')) return
    await fetch(`/api/breeding/${id}`, { method: 'DELETE' })
    load()
  }

  async function addBatch(lineId: string, e: React.FormEvent) {
    e.preventDefault()
    setSavingBatch(true)
    await fetch(`/api/breeding/${lineId}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graftDate, notes: batchNotes }),
    })
    setSavingBatch(false)
    setShowAddBatch(null)
    setGraftDate(''); setBatchNotes('')
    load()
  }

  async function deleteBatch(lineId: string, batchId: string) {
    if (!confirm('Zuchtgang löschen?')) return
    await fetch(`/api/breeding/${lineId}/batches/${batchId}`, { method: 'DELETE' })
    load()
  }

  async function toggleEvent(eventId: string, completed: boolean) {
    await fetch(`/api/breeding/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    })
    load()
  }

  if (loading) return (
    <div className="px-8 py-8 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
    </div>
  )

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Zuchtkalender</h1>
          <p className="text-zinc-500 text-[14px] mt-1">{lines.length} Zuchtreihe{lines.length !== 1 ? 'n' : ''}</p>
        </div>
        <button onClick={() => setShowAddLine(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Zuchtreihe anlegen
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <p className="text-[13px] font-medium text-violet-800">Zuchtphasen</p>
          <p className="text-[12px] text-violet-600 mt-0.5">
            Tag 0: Umlarven · Tag 4: Stiftkontrolle · Tag 11: Schlupf · Tag 14: Begattung · Tag 21: Eilage · Tag 28: Beurteilung
          </p>
        </div>
      </div>

      {/* Empty state */}
      {lines.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <p className="text-[15px] font-medium text-zinc-900">Noch keine Zuchtreihen</p>
          <p className="text-[13px] text-zinc-400 mt-1">Leg eine Zuchtreihe an um loszulegen</p>
        </div>
      )}

      {/* Lines */}
      <div className="space-y-4">
        {lines.map(line => {
          const isOpen = expandedLine === line.id
          const activeBatches = line.batches.filter(b => b.status === 'active')
          return (
            <div key={line.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Line header */}
              <div className="px-5 py-4 flex items-center justify-between">
                <button className="flex-1 text-left" onClick={() => setExpandedLine(isOpen ? null : line.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.75" strokeLinecap="round">
                        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-zinc-900">{line.name}</p>
                      {line.description && <p className="text-[12px] text-zinc-400">{line.description}</p>}
                    </div>
                    <span className="ml-2 text-[11px] font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                      {line.batches.length} Batch{line.batches.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </button>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => { setShowAddBatch(line.id); setExpandedLine(line.id) }}
                    className="text-[12px] font-medium text-amber-600 hover:text-amber-700 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                    + Batch
                  </button>
                  <button onClick={() => deleteLine(line.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Add batch form */}
              {showAddBatch === line.id && (
                <div className="px-5 pb-4 border-t border-zinc-50">
                  <form onSubmit={e => addBatch(line.id, e)} className="pt-4 space-y-3">
                    <p className="text-[13px] font-semibold text-zinc-700">Neuer Zuchtgang</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-zinc-500 mb-1">Umlarv-Datum *</label>
                        <input type="date" required value={graftDate} onChange={e => setGraftDate(e.target.value)}
                          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-zinc-500 mb-1">Notiz</label>
                        <input value={batchNotes} onChange={e => setBatchNotes(e.target.value)} placeholder="optional"
                          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingBatch || !graftDate}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
                        {savingBatch ? 'Wird gespeichert…' : 'Speichern'}
                      </button>
                      <button type="button" onClick={() => setShowAddBatch(null)}
                        className="px-4 py-2 text-[13px] text-zinc-500 hover:text-zinc-700 transition-colors">
                        Abbrechen
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Batches */}
              {isOpen && line.batches.length > 0 && (
                <div className="border-t border-zinc-50 divide-y divide-zinc-50">
                  {line.batches.map(batch => {
                    const next = nextEvent(batch)
                    const allDone = batch.events.every(e => e.completed)
                    const daysToNext = next ? daysUntil(next.date) : null

                    return (
                      <div key={batch.id} className="px-5 py-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-zinc-900">
                                Umlarven: {formatDate(batch.graftDate)}
                              </span>
                              {allDone && (
                                <span className="text-[11px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Abgeschlossen</span>
                              )}
                            </div>
                            {batch.motherColony && (
                              <p className="text-[12px] text-zinc-400">Muttervolk: {batch.motherColony.name}</p>
                            )}
                            {batch.notes && <p className="text-[12px] text-zinc-400">{batch.notes}</p>}
                          </div>
                          <button onClick={() => deleteBatch(line.id, batch.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors ml-2 shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                          {next && daysToNext !== null && (
                            <div className={`text-right ${daysToNext < 0 ? 'text-rose-600' : daysToNext === 0 ? 'text-amber-600' : 'text-zinc-500'}`}>
                              <p className="text-[12px] font-semibold">
                                {daysToNext < 0 ? `${Math.abs(daysToNext)} Tage überfällig` : daysToNext === 0 ? 'Heute' : `in ${daysToNext} Tagen`}
                              </p>
                              <p className="text-[11px]">{EVENT_LABELS[next.type]?.label}</p>
                            </div>
                          )}
                        </div>

                        {/* Event timeline */}
                        <div className="flex flex-wrap gap-2">
                          {batch.events.map(event => {
                            const meta = EVENT_LABELS[event.type]
                            const isNext = next?.id === event.id
                            return (
                              <button
                                key={event.id}
                                onClick={() => toggleEvent(event.id, !event.completed)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-medium transition-all ${
                                  event.completed
                                    ? 'bg-zinc-100 text-zinc-400 border-zinc-100 line-through'
                                    : isNext
                                    ? `${meta?.color ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'} ring-2 ring-offset-1 ring-amber-300`
                                    : meta?.color ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                }`}
                              >
                                {event.completed ? (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                ) : (
                                  <PhaseIcon type={event.type} size={12} />
                                )}
                                {meta?.label}
                                <span className="opacity-60">
                                  {new Date(event.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {isOpen && line.batches.length === 0 && (
                <div className="border-t border-zinc-50 px-5 py-6 text-center">
                  <p className="text-[13px] text-zinc-400">Noch kein Zuchtgang. Klick auf &quot;+ Batch&quot; um anzufangen.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Line Modal */}
      {showAddLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Zuchtreihe anlegen</h2>
              <button onClick={() => setShowAddLine(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={addLine} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Name *</label>
                <input value={lineName} onChange={e => setLineName(e.target.value)} required placeholder="z.B. Carnica 2024"
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Beschreibung</label>
                <input value={lineDesc} onChange={e => setLineDesc(e.target.value)} placeholder="optional"
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <button type="submit" disabled={savingLine || !lineName}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {savingLine ? 'Wird gespeichert…' : 'Anlegen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
