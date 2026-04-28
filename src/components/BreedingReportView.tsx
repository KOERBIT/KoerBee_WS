'use client'

import { useState } from 'react'
import { QueensRegisterTable } from '@/components/QueensRegisterTable'

interface ReportData {
  lines: Array<{ id: string; name: string; description: string | null; batchCount: number }>
  batches: Array<{
    id: string
    lineId: string
    lineName: string
    graftDate: string
    motherColonyName: string | null
    notes: string | null
    status: string
    events: Array<{
      id: string
      type: string
      date: string
      completed: boolean
      eventValue: number | null
      eventNotes: string | null
    }>
    queens: Array<{
      id: string
      number: string
      hatchDate: string
      status: 'hatched' | 'mated' | 'distributed'
      notes?: string
    }>
    tracking: {
      larvaeGrafted: number | null
      larvaeAccepted: number | null
      queensHatched: number | null
      queensMated: number | null
    }
  }>
  summary: {
    totalQueens: number
    totalHatched: number
    totalMated: number
    totalDistributed: number
  }
}

const EVENT_LABELS: Record<string, string> = {
  graft: 'Umlarven',
  check: 'Stiftkontrolle',
  hatch: 'Schlupf',
  mating: 'Begattung',
  laying: 'Eilage',
  assessment: 'Beurteilung',
}

interface BreedingReportViewProps {
  data: ReportData
}

export function BreedingReportView({ data }: BreedingReportViewProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

  const toggleBatch = (batchId: string) => {
    const next = new Set(expandedBatches)
    if (next.has(batchId)) {
      next.delete(batchId)
    } else {
      next.add(batchId)
    }
    setExpandedBatches(next)
  }

  const queensList = data.batches.flatMap(b =>
    b.queens.map(q => ({
      ...q,
      notes: q.notes ?? null,
      lineName: b.lineName,
      batchGraftDate: b.graftDate,
      motherColonyName: b.motherColonyName,
    }))
  )

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <div className="bg-gradient-to-r from-violet-50 to-amber-50 border border-violet-100 rounded-2xl p-6">
        <h2 className="text-[15px] font-semibold text-zinc-900 mb-4">Zusammenfassung</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Zuchtreihen</p>
            <p className="text-2xl font-semibold text-violet-600">{data.lines.length}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Königinnen gesamt</p>
            <p className="text-2xl font-semibold text-amber-600">{data.summary.totalQueens}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Begattet</p>
            <p className="text-2xl font-semibold text-amber-600">{data.summary.totalMated}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Verteilt</p>
            <p className="text-2xl font-semibold text-zinc-600">{data.summary.totalDistributed}</p>
          </div>
        </div>
      </div>

      {/* Lines Overview */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-[15px] font-semibold text-zinc-900 mb-4">Zuchtreihen</h2>
        <div className="space-y-2">
          {data.lines.map(line => (
            <div key={line.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
              <div>
                <p className="text-[13px] font-medium text-zinc-900">{line.name}</p>
                {line.description && <p className="text-[12px] text-zinc-500">{line.description}</p>}
              </div>
              <span className="text-[12px] font-medium bg-violet-100 text-violet-700 px-2 py-1 rounded">
                {line.batchCount} Batch{line.batchCount !== 1 ? 'es' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Batches with Accordions */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <h2 className="text-[15px] font-semibold text-zinc-900 p-6 pb-0 mb-4">Zuchtgänge</h2>
        <div className="divide-y divide-zinc-100">
          {data.batches.map(batch => (
            <div key={batch.id} className="p-6">
              <button
                onClick={() => toggleBatch(batch.id)}
                className="w-full text-left flex items-center justify-between mb-4 hover:text-amber-600 transition-colors"
              >
                <div>
                  <p className="text-[13px] font-semibold text-zinc-900">
                    {batch.lineName} • Umlarven: {new Date(batch.graftDate).toLocaleDateString('de-DE')}
                  </p>
                  {batch.motherColonyName && (
                    <p className="text-[12px] text-zinc-500">Muttervolk: {batch.motherColonyName}</p>
                  )}
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${expandedBatches.has(batch.id) ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {expandedBatches.has(batch.id) && (
                <div className="space-y-4 mt-4 pt-4 border-t border-zinc-100">
                  {/* Timeline */}
                  <div>
                    <p className="text-[12px] font-semibold text-violet-600 uppercase tracking-wider mb-3">Timeline</p>
                    <div className="space-y-2">
                      {batch.events.map(event => (
                        <div key={event.id} className="flex items-center gap-3 text-[12px]">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              event.completed ? 'bg-green-500' : 'bg-zinc-300'
                            }`}
                          />
                          <span className="text-zinc-600 font-medium min-w-[120px]">
                            {EVENT_LABELS[event.type] || event.type}
                          </span>
                          <span className="text-zinc-500">
                            {new Date(event.date).toLocaleDateString('de-DE')}
                          </span>
                          {event.eventValue && (
                            <span className="text-zinc-700 font-semibold ml-auto">
                              {event.eventValue} Königinnen
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Survival stats */}
                  {batch.tracking.larvaeGrafted && (
                    <div>
                      <p className="text-[12px] font-semibold text-violet-600 uppercase tracking-wider mb-2">Überlebenschance</p>
                      <div className="space-y-1 text-[12px] text-zinc-600">
                        <div>
                          <span className="font-semibold">{batch.tracking.larvaeGrafted}</span> Larven umgelarvt
                        </div>
                        {batch.tracking.larvaeAccepted && (
                          <div className="ml-4">
                            → <span className="font-semibold">{batch.tracking.larvaeAccepted}</span> angenommen (
                            {Math.round((batch.tracking.larvaeAccepted / batch.tracking.larvaeGrafted) * 100)}%)
                          </div>
                        )}
                        {batch.tracking.queensHatched && (
                          <div className="ml-4">
                            → <span className="font-semibold">{batch.tracking.queensHatched}</span> geschlüpft (
                            {batch.tracking.larvaeAccepted
                              ? Math.round((batch.tracking.queensHatched / batch.tracking.larvaeAccepted) * 100)
                              : '—'}
                            %)
                          </div>
                        )}
                        {batch.tracking.queensMated && (
                          <div className="ml-4">
                            → <span className="font-semibold">{batch.tracking.queensMated}</span> begattet (
                            {batch.tracking.queensHatched
                              ? Math.round((batch.tracking.queensMated / batch.tracking.queensHatched) * 100)
                              : '—'}
                            %)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Queens */}
                  {batch.queens.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-violet-600 uppercase tracking-wider mb-2">
                        Königinnen ({batch.queens.length})
                      </p>
                      <div className="space-y-1 text-[12px]">
                        {batch.queens.map(q => (
                          <div key={q.id} className="font-mono text-zinc-700">
                            {q.number}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All Queens Table */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-[15px] font-semibold text-zinc-900 mb-4">Alle Königinnen</h2>
        <QueensRegisterTable queens={queensList} />
      </div>
    </div>
  )
}
