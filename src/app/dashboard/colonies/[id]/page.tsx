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

const TREATMENT_LABELS: Record<string, string> = {
  varroa: 'Varroabehandlung', feeding: 'Fütterung', oxalic_acid: 'Oxalsäure',
  formic_acid: 'Ameisensäure', thymol: 'Thymol', antibiotic: 'Antibiotikum', other: 'Sonstiges',
}

const CRITERIA_LABELS: Record<string, string> = {
  population: 'Volksstärke', temperament: 'Sanftmut', vitality: 'Vitalität',
  brood_pattern: 'Brutnest', comb_building: 'Wabenbau', food_stores: 'Futtervorrat',
  swarm_drive: 'Schwarmtrieb', varroa: 'Varroa %', honey_supers: 'Honigräume',
  queen_seen: 'Königin gesehen', queen_cells: 'Königinnenzellen',
  disease_signs: 'Krankheitsanzeichen', notes_field: 'Anmerkungen',
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inspektionen */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-zinc-900">Inspektionen</h2>
            <Link href="/dashboard/inspections" className="text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors">+ Neue</Link>
          </div>
          {colony.inspections.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-zinc-400">Noch keine Inspektionen</p>
          ) : (
            <div className="divide-y divide-zinc-50 max-h-96 overflow-y-auto">
              {colony.inspections.map((ins) => {
                const varroaItem = ins.items.find(i => i.key === 'varroa')
                const popItem = ins.items.find(i => i.key === 'population')
                return (
                  <div key={ins.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[13px] font-semibold text-zinc-800">
                        {new Date(ins.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-3">
                        {varroaItem && <span className="text-[12px] text-zinc-500">Varroa: <strong>{varroaItem.value}%</strong></span>}
                        {popItem && (
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              <div key={n} className={`w-2 h-2 rounded-sm ${parseInt(popItem.value) >= n ? 'bg-amber-400' : 'bg-zinc-100'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {ins.items.filter(i => !['varroa','population','notes_field'].includes(i.key)).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ins.items.filter(i => !['varroa','population','notes_field'].includes(i.key)).slice(0,4).map(item => (
                          <span key={item.key} className="text-[11px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-md">
                            {CRITERIA_LABELS[item.key] ?? item.key}: {item.value}
                          </span>
                        ))}
                      </div>
                    )}
                    {ins.notes && <p className="text-[12px] text-zinc-400 italic mt-1.5">{ins.notes}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Behandlungen */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-zinc-900">Behandlungen</h2>
            <Link href="/dashboard/treatments" className="text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors">+ Neue</Link>
          </div>
          {colony.treatments.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-zinc-400">Noch keine Behandlungen</p>
          ) : (
            <div className="divide-y divide-zinc-50 max-h-96 overflow-y-auto">
              {colony.treatments.map((t) => (
                <div key={t.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-800">{TREATMENT_LABELS[t.type] ?? t.type}</p>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      {new Date(t.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {t.amount && (
                    <span className="text-[13px] font-medium text-zinc-600">{t.amount} {t.unit}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
