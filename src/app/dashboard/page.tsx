import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Placeholder data — wird später durch Prisma-Abfragen ersetzt
const stats = [
  {
    label: 'Standorte',
    value: '3',
    sub: 'Aktive Standorte',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    label: 'Völker',
    value: '12',
    sub: 'Aktive Völker',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    label: 'Inspektionen',
    value: '8',
    sub: 'Diesen Monat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="12" y2="16" />
      </svg>
    ),
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    label: 'Varroa-Ø',
    value: '2.1%',
    sub: 'Befallsrate gesamt',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
]

const recentInspections = [
  { colony: 'Volk 3 — Waldhang', date: '30. März 2026', status: 'gut', varroa: '1.8%', location: 'Standort Nord' },
  { colony: 'Volk 7 — Obstwiese', date: '28. März 2026', status: 'kontrollieren', varroa: '3.4%', location: 'Standort Süd' },
  { colony: 'Volk 1 — Hauptvolk', date: '25. März 2026', status: 'gut', varroa: '0.9%', location: 'Standort Nord' },
  { colony: 'Volk 5 — Ableger', date: '22. März 2026', status: 'behandeln', varroa: '5.1%', location: 'Standort West' },
]

const apiaries = [
  { name: 'Standort Nord', colonies: 5, lat: '48.1351° N', lastVisit: 'vor 3 Tagen' },
  { name: 'Standort Süd', colonies: 4, lat: '48.0521° N', lastVisit: 'vor 5 Tagen' },
  { name: 'Standort West', colonies: 3, lat: '48.2011° N', lastVisit: 'vor 1 Woche' },
]

const statusBadge: Record<string, string> = {
  gut: 'bg-green-100 text-green-700',
  kontrollieren: 'bg-amber-100 text-amber-700',
  behandeln: 'bg-rose-100 text-rose-700',
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

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[13px] font-medium text-zinc-400 uppercase tracking-widest mb-1">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {greeting()}, {firstName}
        </h1>
        <p className="text-zinc-500 mt-1 text-[15px]">Hier ist dein Überblick für heute.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
              {s.icon}
            </div>
            <p className="text-2xl font-semibold text-zinc-900 tracking-tight">{s.value}</p>
            <p className="text-[13px] font-medium text-zinc-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meine Standorte */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-900">Meine Standorte</h2>
              <a href="/dashboard/apiaries" className="text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors">
                Alle →
              </a>
            </div>
            <div className="divide-y divide-zinc-50">
              {apiaries.map((a) => (
                <div key={a.name} className="px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer">
                  <div>
                    <p className="text-[14px] font-medium text-zinc-900">{a.name}</p>
                    <p className="text-[12px] text-zinc-400 mt-0.5">{a.lastVisit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-zinc-900">{a.colonies}</p>
                    <p className="text-[12px] text-zinc-400">Völker</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3.5 border-t border-zinc-50">
              <button className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors py-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Standort hinzufügen
              </button>
            </div>
          </div>

          {/* Schnellaktionen */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mt-6">
            <h2 className="text-[15px] font-semibold text-zinc-900 mb-4">Schnellaktionen</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[14px] font-medium transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                Neue Inspektion
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[14px] font-medium transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                </svg>
                NFC-Chip scannen
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[14px] font-medium transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Neues Volk anlegen
              </button>
            </div>
          </div>
        </div>

        {/* Letzte Inspektionen */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-900">Letzte Inspektionen</h2>
              <a href="/dashboard/inspections" className="text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors">
                Alle →
              </a>
            </div>
            <div className="divide-y divide-zinc-50">
              {recentInspections.map((ins) => (
                <div key={ins.colony} className="px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-zinc-900">{ins.colony}</p>
                      <p className="text-[12px] text-zinc-400 mt-0.5">{ins.location} · {ins.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[12px] text-zinc-400">Varroa</p>
                      <p className="text-[13px] font-semibold text-zinc-700">{ins.varroa}</p>
                    </div>
                    <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${statusBadge[ins.status]}`}>
                      {ins.status.charAt(0).toUpperCase() + ins.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Varroa-Übersicht Banner */}
          <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl shadow-sm p-5 mt-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium text-amber-100 uppercase tracking-widest">Saison-Tipp</p>
                <h3 className="text-[17px] font-semibold mt-1">Varroabehandlung April</h3>
                <p className="text-[13px] text-amber-100 mt-2 leading-relaxed max-w-xs">
                  2 deiner Völker überschreiten den Schwellenwert von 3%. Jetzt Behandlung planen.
                </p>
                <button className="mt-4 px-4 py-2 bg-white text-amber-600 rounded-xl text-[13px] font-semibold hover:bg-amber-50 transition-colors">
                  Behandlung planen
                </button>
              </div>
              <div className="opacity-20">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="white" stroke="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
