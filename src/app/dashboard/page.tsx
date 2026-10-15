import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Imker'
  const userId = session!.user.id

  const [
    apiaries,
    colonyCount,
    recentInspections,
    openTasks,
    treatmentCount,
    breedingLineCount,
    queenCount,
    productCount,
    pendingPreorders,
    blogCount,
  ] = await Promise.all([
    prisma.apiary.findMany({
      where: { userId },
      include: { _count: { select: { colonies: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.colony.count({ where: { apiary: { userId } } }),
    prisma.inspection.findMany({
      where: { colony: { apiary: { userId } } },
      include: { colony: { include: { apiary: { select: { name: true } } } }, items: true },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.task.count({ where: { userId, completed: false } }),
    prisma.treatment.count({ where: { colony: { apiary: { userId } } } }),
    prisma.breedingLine.count({ where: { userId } }),
    prisma.breedingBatch.count({ where: { line: { userId } } }),
    prisma.product.count({ where: { userId } }),
    prisma.preOrder.count({ where: { status: 'PENDING' } }),
    prisma.blogPost.count({ where: { userId } }),
  ])

  // Varroa avg
  const varroaValues = recentInspections
    .flatMap(i => i.items.filter(item => item.key === 'varroa').map(item => parseFloat(item.value)))
    .filter(v => !isNaN(v))
  const avgVarroa = varroaValues.length > 0
    ? (varroaValues.reduce((a, b) => a + b, 0) / varroaValues.length).toFixed(1)
    : null

  const needsTreatment = recentInspections.filter(i => {
    const v = i.items.find(item => item.key === 'varroa')
    return v && parseFloat(v.value) > 3
  }).length

  const lastInspectionDate = recentInspections[0]
    ? new Date(recentInspections[0].date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
    : null

  const totalColoniesAtApiaries = apiaries.reduce((s, a) => s + a._count.colonies, 0)

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[13px] font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--dash-text-muted)' }}>
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--dash-text)' }}>
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-[15px]" style={{ color: 'var(--dash-text-dim)' }}>
          Hier ist dein Überblick für heute.
        </p>
      </div>

      {/* Varroa Alert Banner */}
      {needsTreatment > 0 && (
        <Link href="/dashboard/treatments" className="dash-tile block mb-6 p-5" style={{ background: 'linear-gradient(135deg, var(--dash-accent-2), var(--dash-accent))', border: 'none' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-widest opacity-80" style={{ color: 'white' }}>Handlungsbedarf</p>
              <h3 className="text-[17px] font-semibold mt-1" style={{ color: 'white' }}>
                {needsTreatment} Volk{needsTreatment !== 1 ? '' : ''} über Varroa-Schwellenwert
              </h3>
            </div>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
        </Link>
      )}

      {/* Main Tile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">

        {/* ===== Meine Imkerei (large tile) ===== */}
        <Link href="/dashboard/apiaries" className="dash-tile p-5 sm:col-span-2 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--dash-accent-soft)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
              </svg>
            </div>
            <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}>
              {apiaries.filter(a => a.status === 'active').length} aktiv
            </span>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Meine Imkerei</h2>
          <p className="text-[13px] mb-5" style={{ color: 'var(--dash-text-dim)' }}>
            {apiaries.length} Standort{apiaries.length !== 1 ? 'e' : ''} · {totalColoniesAtApiaries} Völker
          </p>
          {/* Mini apiary list */}
          <div className="space-y-2">
            {apiaries.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--dash-accent-soft)' }}>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--dash-text)' }}>{a.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
                    {a.lat && a.lng ? `${a.lat.toFixed(2)}°, ${a.lng.toFixed(2)}°` : 'Kein Standort'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--dash-accent)' }}>{a._count.colonies}</p>
                  <p className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>Völker</p>
                </div>
              </div>
            ))}
          </div>
        </Link>

        {/* ===== Inspektionen ===== */}
        <Link href="/dashboard/inspections" className="dash-tile p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--dash-accent-soft)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent-2, var(--dash-accent))" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Inspektionen</h2>
          <p className="text-[13px] mb-3" style={{ color: 'var(--dash-text-dim)' }}>
            {lastInspectionDate ? `Letzte: ${lastInspectionDate}` : 'Noch keine'}
          </p>
          <div className="mt-auto flex items-end justify-between">
            <div>
              <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--dash-text)' }}>
                {avgVarroa ? `${avgVarroa}%` : '—'}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>Varroa-Ø</p>
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--dash-accent)' }}>{recentInspections.length} letzte</p>
          </div>
        </Link>

        {/* ===== Behandlungen ===== */}
        <Link href="/dashboard/treatments" className="dash-tile p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--dash-accent-soft)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent-3, var(--dash-accent))" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
              <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Behandlungen</h2>
          <p className="text-[13px]" style={{ color: 'var(--dash-text-dim)' }}>Varroa & Fütterung</p>
          <div className="mt-auto pt-3">
            <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--dash-text)' }}>{treatmentCount}</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>diese Saison</p>
          </div>
        </Link>

        {/* ===== Kalender ===== */}
        <Link href="/dashboard/calendar" className="dash-tile p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--dash-accent-soft)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Kalender</h2>
          <p className="text-[13px]" style={{ color: 'var(--dash-text-dim)' }}>Aufgaben & Termine</p>
          <div className="mt-auto pt-3">
            <p className="text-[28px] font-bold leading-none" style={{ color: openTasks > 0 ? 'var(--dash-accent-2, var(--dash-accent))' : 'var(--dash-text)' }}>{openTasks}</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>offene Aufgaben</p>
          </div>
        </Link>

        {/* ===== Zucht ===== */}
        <Link href="/dashboard/breeding" className="dash-tile p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--dash-accent-soft)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent-2, var(--dash-accent))" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Zucht</h2>
          <p className="text-[13px]" style={{ color: 'var(--dash-text-dim)' }}>Königinnenzucht</p>
          <div className="mt-auto pt-3 flex items-end gap-4">
            <div>
              <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--dash-text)' }}>{breedingLineCount}</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>Zuchtlinien</p>
            </div>
            <div>
              <p className="text-[20px] font-semibold leading-none" style={{ color: 'var(--dash-text-dim)' }}>{queenCount}</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>Königinnen</p>
            </div>
          </div>
        </Link>

        {/* ===== Kassenbuch (large tile) ===== */}
        <Link href="/dashboard/kassenbuch" className="dash-tile p-5 sm:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--dash-accent-soft)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Kassenbuch</h2>
          <p className="text-[13px] mb-4" style={{ color: 'var(--dash-text-dim)' }}>Verkäufe, Ausgaben & Lager</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Produkte', value: productCount, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
              { label: 'Vorbestellt', value: pendingPreorders, icon: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0' },
              { label: 'Behandlungen', value: treatmentCount, icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl px-3 py-3 text-center" style={{ background: 'var(--dash-accent-soft)' }}>
                <p className="text-[18px] font-bold" style={{ color: 'var(--dash-text)' }}>{s.value}</p>
                <p className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </Link>

        {/* ===== Tracht & Futter ===== */}
        <Link href="/dashboard/tracht" className="dash-tile p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--dash-accent-soft)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent-3, var(--dash-accent))" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12"/><path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5z"/><path d="M12 12c0-3-2-5-5-5 0 3 2 5 5 5z"/><circle cx="12" cy="8" r="2.5"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Tracht & Futter</h2>
          <p className="text-[13px]" style={{ color: 'var(--dash-text-dim)' }}>Trachtprognose & Futterrechner</p>
          <div className="mt-auto pt-3 flex gap-2">
            <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}>Tracht</span>
            <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}>Futter</span>
          </div>
        </Link>

        {/* ===== Shop ===== */}
        <Link href="/dashboard/vorbestellungen" className="dash-tile p-5 sm:col-span-2 lg:col-span-1 flex flex-col">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--dash-accent-soft)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6h15l-1.5 9H7.5L6 6z"/><path d="M6 6L5 2H2"/><circle cx="9" cy="19" r="1.5"/><circle cx="18" cy="19" r="1.5"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Shop</h2>
          <p className="text-[13px] mb-3" style={{ color: 'var(--dash-text-dim)' }}>Bestellungen & Kunden</p>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'var(--dash-accent-soft)' }}>
              <p className="text-[16px] font-bold" style={{ color: pendingPreorders > 0 ? 'var(--dash-accent-2, var(--dash-accent))' : 'var(--dash-text)' }}>{pendingPreorders}</p>
              <p className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>Offen</p>
            </div>
            <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'var(--dash-accent-soft)' }}>
              <p className="text-[16px] font-bold" style={{ color: 'var(--dash-text)' }}>{productCount}</p>
              <p className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>Produkte</p>
            </div>
          </div>
        </Link>

        {/* ===== Inhalte & Blog ===== */}
        <Link href="/dashboard/blog" className="dash-tile p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--dash-accent-soft)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent-2, var(--dash-accent))" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/>
              <line x1="10" y1="6" x2="18" y2="6"/><line x1="10" y1="10" x2="18" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>Inhalte & Blog</h2>
          <p className="text-[13px]" style={{ color: 'var(--dash-text-dim)' }}>Website, Blog & Medien</p>
          <div className="mt-auto pt-3">
            <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--dash-text)' }}>{blogCount}</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>Blog-Beiträge</p>
          </div>
        </Link>

        {/* ===== NFC & Tools ===== */}
        <Link href="/dashboard/nfc" className="dash-tile p-5 flex flex-col">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--dash-accent-soft)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dash-accent-3, var(--dash-accent))" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6"/>
              <path d="M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6"/>
              <circle cx="12" cy="12" r="1" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--dash-text)' }}>NFC & Tools</h2>
          <p className="text-[13px]" style={{ color: 'var(--dash-text-dim)' }}>Tags, Scanner & Einstellungen</p>
          <div className="mt-auto pt-3 flex gap-2">
            <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}>NFC</span>
            <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}>Settings</span>
          </div>
        </Link>

      </div>

      {/* Quick Actions Footer */}
      <div className="mt-6 dash-tile p-5">
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--dash-text)' }}>Schnellaktionen</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Neue Inspektion', href: '/dashboard/inspections', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 3h6v4H9zM12 11v6M9 14h6' },
            { label: 'Aufgabe planen', href: '/dashboard/calendar', icon: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
            { label: 'Volk anlegen', href: '/dashboard/colonies', icon: 'M12 5v14M5 12h14' },
            { label: 'Zuchtkalender', href: '/dashboard/breeding', icon: 'M12 8a4 4 0 100-8 4 4 0 000 8zM6 20v-2a6 6 0 0112 0v2' },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'var(--dash-accent-soft)', color: 'var(--dash-accent)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={a.icon} />
              </svg>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
