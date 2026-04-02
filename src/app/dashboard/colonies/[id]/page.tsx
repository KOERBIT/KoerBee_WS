import React from 'react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ColonyDetailActions } from './ColonyDetailActions'

const QUEEN_COLOR_DOT: Record<string, string> = {
  weiß: 'bg-white border-2 border-zinc-300',
  gelb: 'bg-yellow-400',
  rot:  'bg-red-500',
  grün: 'bg-green-500',
  blau: 'bg-blue-500',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Aktiv',       color: 'bg-green-100 text-green-700' },
  dissolved: { label: 'Aufgelöst',   color: 'bg-zinc-100 text-zinc-500' },
  dead:      { label: 'Abgestorben', color: 'bg-rose-100 text-rose-600' },
  sold:      { label: 'Verkauft',    color: 'bg-blue-100 text-blue-600' },
  swarmed:   { label: 'Abgeschwärmt',color: 'bg-amber-100 text-amber-700' },
}

const CRITERIA_LABELS: Record<string, string> = {
  population: 'Volksstärke', temperament: 'Sanftmut', vitality: 'Vitalität',
  brood_pattern: 'Brutnest', comb_building: 'Wabenbau', food_stores: 'Futtervorrat',
  swarm_drive: 'Schwarmtrieb', varroa: 'Varroa %', honey_supers: 'Honigräume',
  queen_seen: 'Königin gesehen', queen_cells: 'Königinnenzellen',
  disease_signs: 'Krankheitsanzeichen', notes_field: 'Anmerkungen',
}

function treatmentCategory(type: string): { label: string; icon: React.ReactNode; color: string } {
  if (type === 'feeding') return {
    label: 'Fütterung',
    color: 'bg-blue-50 text-blue-600',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6 2 3 7 3 12a9 9 0 0018 0c0-5-3-10-9-10z"/><path d="M12 12v5"/>
      </svg>
    ),
  }
  if (type === 'honey_harvest') return {
    label: 'Honigernte',
    color: 'bg-amber-50 text-amber-600',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 4.8 5.2.8-3.8 3.6.9 5.3L12 14l-4.7 2.5.9-5.3L4.4 7.6l5.2-.8z"/>
      </svg>
    ),
  }
  if (['varroa','oxalic_acid','formic_acid','thymol','antibiotic'].includes(type)) return {
    label: 'Varroabehandlung',
    color: 'bg-rose-50 text-rose-600',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l9 4.5v5C21 17 17 21 12 22 7 21 3 17 3 11.5v-5z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  }
  return {
    label: 'Behandlung',
    color: 'bg-zinc-100 text-zinc-500',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V8.5L15.5 2z"/>
        <polyline points="15 2 15 9 22 9"/>
      </svg>
    ),
  }
}

const INSPECTION_META = {
  label: 'Kontrolle',
  color: 'bg-green-50 text-green-600',
  icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
}

export default async function ColonyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  const colony = await prisma.colony.findFirst({
    where: { id, apiary: { userId: session!.user.id } },
    include: {
      apiary: { select: { id: true, name: true } },
      inspections: {
        include: { items: true },
        orderBy: { date: 'desc' },
      },
      treatments: { orderBy: { date: 'desc' } },
      _count: { select: { nfcTags: true } },
    },
  })

  if (!colony) notFound()

  const status = STATUS_LABELS[colony.status] ?? STATUS_LABELS.active

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-zinc-400 mb-6">
        <Link href="/dashboard/colonies" className="hover:text-zinc-700 transition-colors">Völker</Link>
        <span>/</span>
        <span className="text-zinc-700">{colony.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{colony.name}</h1>
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
            </div>
            <Link href={`/dashboard/apiaries/${colony.apiary.id}`} className="text-[14px] text-zinc-400 hover:text-amber-600 transition-colors mt-0.5 inline-block">
              {colony.apiary.name}
            </Link>
          </div>
        </div>
        <ColonyDetailActions colony={{ id: colony.id, name: colony.name, status: colony.status }} />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Königin</p>
          <div className="flex items-center gap-2">
            {colony.queenColor && <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${QUEEN_COLOR_DOT[colony.queenColor] ?? 'bg-zinc-300'}`} />}
            <p className="text-[15px] font-semibold text-zinc-900">{colony.queenYear ?? '—'}</p>
          </div>
          {colony.queenColor && <p className="text-[12px] text-zinc-400 mt-0.5 capitalize">{colony.queenColor}</p>}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Inspektionen</p>
          <p className="text-[22px] font-semibold text-zinc-900">{colony.inspections.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Behandlungen</p>
          <p className="text-[22px] font-semibold text-zinc-900">{colony.treatments.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-2">NFC-Tags</p>
          <p className="text-[22px] font-semibold text-zinc-900">{colony._count.nfcTags}</p>
        </div>
      </div>

      {/* Dissolution note */}
      {colony.status !== 'active' && colony.statusNote && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 mb-6">
          <p className="text-[13px] font-medium text-zinc-600">
            {status.label} am {colony.statusChangedAt ? new Date(colony.statusChangedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
          <p className="text-[13px] text-zinc-500 mt-1">{colony.statusNote}</p>
        </div>
      )}

      {/* Chronik – unified timeline */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-zinc-900">Chronik</h2>
          <Link href="/dashboard/inspections" className="text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors">+ Kontrolle</Link>
        </div>
        {colony.inspections.length === 0 && colony.treatments.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-zinc-400">Noch keine Einträge</p>
        ) : (() => {
          type TimelineItem =
            | { kind: 'inspection'; date: Date; id: string; ins: typeof colony.inspections[0] }
            | { kind: 'treatment'; date: Date; id: string; t: typeof colony.treatments[0] }

          const items: TimelineItem[] = [
            ...colony.inspections.map(ins => ({ kind: 'inspection' as const, date: new Date(ins.date), id: ins.id, ins })),
            ...colony.treatments.map(t => ({ kind: 'treatment' as const, date: new Date(t.date), id: t.id, t })),
          ].sort((a, b) => b.date.getTime() - a.date.getTime())

          return (
            <div className="px-5 py-4 space-y-4">
              {items.map((item, idx) => {
                if (item.kind === 'inspection') {
                  const ins = item.ins
                  const varroaItem = ins.items.find(i => i.key === 'varroa')
                  const popItem = ins.items.find(i => i.key === 'population')
                  const notesItem = ins.items.find(i => i.key === 'notes_field')
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${INSPECTION_META.color}`}>
                          {INSPECTION_META.icon}
                        </div>
                        {idx < items.length - 1 && <div className="w-px flex-1 bg-zinc-100 mt-1" />}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-semibold text-zinc-900">{INSPECTION_META.label}</span>
                          <span className="text-[12px] text-zinc-400">
                            {item.date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {varroaItem && (
                            <span className="text-[11px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-medium">Varroa {varroaItem.value}%</span>
                          )}
                          {popItem && (
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(n => (
                                <div key={n} className={`w-2 h-2 rounded-sm ${parseInt(popItem.value) >= n ? 'bg-amber-400' : 'bg-zinc-100'}`} />
                              ))}
                            </div>
                          )}
                          {ins.items.filter(i => !['varroa','population','notes_field'].includes(i.key)).slice(0,3).map(it => (
                            <span key={it.key} className="text-[11px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-md">
                              {CRITERIA_LABELS[it.key] ?? it.key}: {it.value}
                            </span>
                          ))}
                        </div>
                        {(ins.notes || notesItem?.value) && (
                          <p className="text-[12px] text-zinc-400 italic mt-1">{ins.notes || notesItem?.value}</p>
                        )}
                      </div>
                    </div>
                  )
                } else {
                  const t = item.t
                  const meta = treatmentCategory(t.type)
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                          {meta.icon}
                        </div>
                        {idx < items.length - 1 && <div className="w-px flex-1 bg-zinc-100 mt-1" />}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-semibold text-zinc-900">{meta.label}</span>
                          <span className="text-[12px] text-zinc-400">
                            {item.date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        {t.amount && (
                          <span className="text-[12px] text-zinc-500">{t.amount} {t.unit}</span>
                        )}
                        {t.notes && <p className="text-[12px] text-zinc-400 italic mt-0.5">{t.notes}</p>}
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
