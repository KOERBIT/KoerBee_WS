import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ApiaryDetailActions } from './ApiaryDetailActions'
import { AddColonyButton } from '@/app/dashboard/colonies/ColonyActions'
import { WeatherWidget } from '@/components/WeatherWidget'
import { ApiaryMapClient } from '@/components/ApiaryMapClient'

const QUEEN_COLOR_DOT: Record<string, string> = {
  weiß: 'bg-white border border-zinc-300',
  gelb: 'bg-yellow-400',
  rot:  'bg-red-500',
  grün: 'bg-green-500',
  blau: 'bg-blue-500',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:  { label: 'Aktiv',       color: 'bg-green-100 text-green-700' },
  closed:  { label: 'Aufgegeben',  color: 'bg-zinc-100 text-zinc-500' },
}

export default async function ApiaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  const [apiary, allApiaries] = await Promise.all([
    prisma.apiary.findFirst({
      where: { id, userId: session!.user.id },
      include: {
        colonies: {
          include: {
            inspections: { orderBy: { date: 'desc' }, take: 1 },
            _count: { select: { inspections: true, treatments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { colonies: true } },
      },
    }),
    prisma.apiary.findMany({ where: { userId: session!.user.id }, select: { id: true, name: true, flightRadius: true } }),
  ])

  if (!apiary) notFound()

  const status = STATUS_LABELS[apiary.status] ?? STATUS_LABELS.active
  const activeColonies = apiary.colonies.filter(c => c.status === 'active')
  const inactiveColonies = apiary.colonies.filter(c => c.status !== 'active')

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-zinc-400 mb-6">
        <Link href="/dashboard/apiaries" className="hover:text-zinc-700 transition-colors">Standorte</Link>
        <span>/</span>
        <span className="text-zinc-700">{apiary.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{apiary.name}</h1>
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
            </div>
            {apiary.lat && apiary.lng ? (
              <p className="text-[14px] text-zinc-400 mt-0.5">{apiary.lat.toFixed(4)}°N, {apiary.lng.toFixed(4)}°E</p>
            ) : (
              <p className="text-[14px] text-zinc-400 mt-0.5">Kein Standort hinterlegt</p>
            )}
          </div>
        </div>
        <ApiaryDetailActions apiary={{ id: apiary.id, name: apiary.name, status: apiary.status, lat: apiary.lat ?? null, lng: apiary.lng ?? null, notes: apiary.notes ?? null }} />
      </div>

      {/* Info */}
      {apiary.notes && (
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-6">
          <p className="text-[13px] font-medium text-zinc-500 mb-1">Notizen</p>
          <p className="text-[14px] text-zinc-700">{apiary.notes}</p>
        </div>
      )}

      {/* Dissolution note */}
      {apiary.status !== 'active' && apiary.statusNote && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 mb-6">
          <p className="text-[13px] font-medium text-zinc-600">
            Aufgegeben am {apiary.statusChangedAt ? new Date(apiary.statusChangedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
          <p className="text-[13px] text-zinc-500 mt-1">{apiary.statusNote}</p>
        </div>
      )}

      {/* Karte + Wetter */}
      {apiary.lat && apiary.lng && (
        <>
          <ApiaryMapClient lat={apiary.lat} lng={apiary.lng} name={apiary.name} flightRadius={apiary.flightRadius} />
          <WeatherWidget lat={apiary.lat} lng={apiary.lng} />
        </>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-[22px] font-semibold text-zinc-900">{activeColonies.length}</p>
          <p className="text-[12px] text-zinc-400 mt-0.5">Aktive Völker</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-[22px] font-semibold text-zinc-900">
            {apiary.colonies.reduce((sum, c) => sum + c._count.inspections, 0)}
          </p>
          <p className="text-[12px] text-zinc-400 mt-0.5">Inspektionen</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-[22px] font-semibold text-zinc-900">
            {apiary.colonies.reduce((sum, c) => sum + c._count.treatments, 0)}
          </p>
          <p className="text-[12px] text-zinc-400 mt-0.5">Behandlungen</p>
        </div>
      </div>

      {/* Colonies */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-zinc-900">Völker ({activeColonies.length})</h2>
          {apiary.status === 'active' && <AddColonyButton apiaries={allApiaries} defaultApiaryId={id} />}
        </div>
        {activeColonies.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-zinc-400">Noch keine aktiven Völker an diesem Standort</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {activeColonies.map((c) => {
              const lastInspection = c.inspections[0]
              return (
                <Link key={c.id} href={`/dashboard/colonies/${c.id}`}
                  className="px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-zinc-900">{c.name}</p>
                      <p className="text-[12px] text-zinc-400 mt-0.5">
                        {c.queenYear ? `Königin ${c.queenYear}` : 'Königin unbekannt'}
                        {c.queenColor && <span className={`inline-block w-2 h-2 rounded-full ml-2 ${QUEEN_COLOR_DOT[c.queenColor] ?? 'bg-zinc-300'}`} />}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-zinc-400">
                      {lastInspection
                        ? `Letzte Insp. ${new Date(lastInspection.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`
                        : 'Keine Inspektion'}
                    </p>
                    <p className="text-[12px] text-zinc-300 mt-0.5">{c._count.inspections} Insp. · {c._count.treatments} Beh.</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Inactive colonies */}
        {inactiveColonies.length > 0 && (
          <details className="border-t border-zinc-100">
            <summary className="px-5 py-3 text-[13px] text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors select-none">
              {inactiveColonies.length} inaktive{inactiveColonies.length !== 1 ? 's' : ''} Volk anzeigen
            </summary>
            <div className="divide-y divide-zinc-50">
              {inactiveColonies.map((c) => (
                <Link key={c.id} href={`/dashboard/colonies/${c.id}`}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50 transition-colors opacity-60">
                  <p className="text-[13px] text-zinc-600">{c.name}</p>
                  <span className="text-[12px] text-zinc-400 capitalize">{c.status}</span>
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
