import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const statusBadge: Record<string, string> = {
  gut:          'bg-green-100 text-green-700',
  kontrollieren:'bg-amber-100 text-amber-700',
  behandeln:    'bg-rose-100 text-rose-700',
}

function varroaStatus(varroa: string | null): { label: string; key: string } {
  if (!varroa) return { label: '—', key: 'gut' }
  const v = parseFloat(varroa)
  if (v <= 2) return { label: 'Gut', key: 'gut' }
  if (v <= 4) return { label: 'Kontrollieren', key: 'kontrollieren' }
  return { label: 'Behandeln', key: 'behandeln' }
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Imker'

  const [apiaries, allColonies, recentInspections, openTasks, totalTreatments] = await Promise.all([
    prisma.apiary.findMany({
      where: { userId: session!.user.id },
      include: { _count: { select: { colonies: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.colony.count({ where: { apiary: { userId: session!.user.id } } }),
    prisma.inspection.findMany({
      where: { colony: { apiary: { userId: session!.user.id } } },
      include: { colony: { include: { apiary: { select: { id: true, name: true } } } }, items: true },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.task.count({ where: { userId: session!.user.id, completed: false } }),
    prisma.treatment.count({ where: { colony: { apiary: { userId: session!.user.id } } } }),
  ])

  // Durchschnittlicher Varroa-Befall aus letzten Inspektionen
  const varroaValues = recentInspections
    .flatMap(i => i.items.filter(item => item.key === 'varroa').map(item => parseFloat(item.value)))
    .filter(v => !isNaN(v))
  const avgVarroa = varroaValues.length > 0
    ? (varroaValues.reduce((a, b) => a + b, 0) / varroaValues.length).toFixed(1)
    : null

  const stats = [
    { label: 'Standorte', value: String(apiaries.length), sub: 'Aktive Standorte', href: '/dashboard/apiaries', color: 'text-blue-500', bg: 'bg-blue-50',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg> },
    { label: 'Völker', value: String(allColonies), sub: 'Aktive Völker', href: '/dashboard/colonies', color: 'text-amber-500', bg: 'bg-amber-50',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
    { label: 'Offene Aufgaben', value: String(openTasks), sub: 'Im Kalender', href: '/dashboard/calendar', color: 'text-green-500', bg: 'bg-green-50',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { label: 'Varroa-Ø', value: avgVarroa ? `${avgVarroa}%` : '—', sub: 'Letzte Inspektionen', href: '/dashboard/inspections', color: 'text-rose-500', bg: 'bg-rose-50',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  ]

  const needsTreatment = recentInspections.filter(i => {
    const v = i.items.find(item => item.key === 'varroa')
    return v && parseFloat(v.value) > 3
  }).length

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[13px] font-medium text-zinc-400 uppercase tracking-widest mb-1">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{greeting()}, {firstName}</h1>
        <p className="text-zinc-500 mt-1 text-[15px]">Hier ist dein Überblick für heute.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>{s.icon}</div>
            <p className="text-2xl font-semibold text-zinc-900 tracking-tight">{s.value}</p>
            <p className="text-[13px] font-medium text-zinc-500 mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meine Standorte */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-900">Meine Standorte</h2>
              <Link href="/dashboard/apiaries" className="text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors">Alle →</Link>
            </div>
            {apiaries.length === 0 ? (
              <div className="px-5 pb-5 text-center">
                <p className="text-[13px] text-zinc-400">Noch keine Standorte</p>
                <Link href="/dashboard/apiaries" className="mt-2 inline-block text-[13px] font-medium text-amber-600">Ersten Standort anlegen →</Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {apiaries.slice(0, 4).map((a) => (
                  <Link key={a.id} href={`/dashboard/apiaries`} className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                    <div>
                      <p className="text-[14px] font-medium text-zinc-900">{a.name}</p>
                      <p className="text-[12px] text-zinc-400 mt-0.5">
                        {a.lat && a.lng ? `${a.lat.toFixed(3)}°, ${a.lng.toFixed(3)}°` : 'Kein Standort'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-semibold text-zinc-900">{a._count.colonies}</p>
                      <p className="text-[12px] text-zinc-400">Völker</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="px-5 py-3.5 border-t border-zinc-50">
              <Link href="/dashboard/apiaries" className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors py-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Standort hinzufügen
              </Link>
            </div>
          </div>

          {/* Schnellaktionen */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mt-6">
            <h2 className="text-[15px] font-semibold text-zinc-900 mb-4">Schnellaktionen</h2>
            <div className="space-y-2">
              <Link href="/dashboard/inspections" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[14px] font-medium transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                Neue Inspektion
              </Link>
              <Link href="/dashboard/calendar" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[14px] font-medium transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Aufgabe planen
              </Link>
              <Link href="/dashboard/colonies" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[14px] font-medium transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Neues Volk anlegen
              </Link>
              <Link href="/dashboard/breeding" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[14px] font-medium transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
                </svg>
                Zuchtkalender
              </Link>
            </div>
          </div>
        </div>

        {/* Letzte Inspektionen */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-900">Letzte Inspektionen</h2>
              <Link href="/dashboard/inspections" className="text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors">Alle →</Link>
            </div>
            {recentInspections.length === 0 ? (
              <div className="px-5 pb-8 text-center">
                <p className="text-[13px] text-zinc-400">Noch keine Inspektionen</p>
                <Link href="/dashboard/inspections" className="mt-2 inline-block text-[13px] font-medium text-amber-600">Erste Inspektion starten →</Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {recentInspections.map((ins) => {
                  const varroaItem = ins.items.find(i => i.key === 'varroa')
                  const status = varroaStatus(varroaItem?.value ?? null)
                  return (
                    <div key={ins.id} className="px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-zinc-900">{ins.colony.name}</p>
                          <p className="text-[12px] text-zinc-400 mt-0.5">
                            {ins.colony.apiary.name} · {new Date(ins.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {varroaItem && (
                          <div className="text-right">
                            <p className="text-[12px] text-zinc-400">Varroa</p>
                            <p className="text-[13px] font-semibold text-zinc-700">{varroaItem.value}%</p>
                          </div>
                        )}
                        <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${statusBadge[status.key]}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Varroa-Banner (nur wenn Handlungsbedarf) */}
          {needsTreatment > 0 && (
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl shadow-sm p-5 mt-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-amber-100 uppercase tracking-widest">Handlungsbedarf</p>
                  <h3 className="text-[17px] font-semibold mt-1">Varroabehandlung nötig</h3>
                  <p className="text-[13px] text-amber-100 mt-2 leading-relaxed max-w-xs">
                    {needsTreatment} Volk{needsTreatment !== 1 ? '' : ''} überschreitet den Schwellenwert von 3%. Behandlung empfohlen.
                  </p>
                  <Link href="/dashboard/treatments" className="mt-4 inline-block px-4 py-2 bg-white text-amber-600 rounded-xl text-[13px] font-semibold hover:bg-amber-50 transition-colors">
                    Behandlung erfassen
                  </Link>
                </div>
                <div className="opacity-20">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Stats summary wenn kein Varroa-Banner */}
          {needsTreatment === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 mt-6">
              <h2 className="text-[15px] font-semibold text-zinc-900 mb-4">Saison-Übersicht</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-2xl font-semibold text-zinc-900">{recentInspections.length}</p>
                  <p className="text-[13px] text-zinc-500 mt-0.5">Inspektionen gesamt</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-2xl font-semibold text-zinc-900">{totalTreatments}</p>
                  <p className="text-[13px] text-zinc-500 mt-0.5">Behandlungen gesamt</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
