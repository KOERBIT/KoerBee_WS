import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AddInspectionButton } from './InspectionActions'
import { InspectionRowMenu } from './InspectionRowMenu'

function getVarroaFromItems(items: { key: string; value: string }[]) {
  return items.find(i => i.key === 'varroa')?.value ?? null
}

function getStatusColor(varroa: string | null) {
  if (!varroa) return null
  const v = parseFloat(varroa)
  if (v <= 2) return { dot: 'bg-green-400', label: 'Gut', badge: 'bg-green-100 text-green-700' }
  if (v <= 4) return { dot: 'bg-amber-400', label: 'Kontrollieren', badge: 'bg-amber-100 text-amber-700' }
  return { dot: 'bg-rose-500', label: 'Behandeln', badge: 'bg-rose-100 text-rose-700' }
}

export default async function InspectionsPage() {
  const session = await getServerSession(authOptions)

  const [inspections, colonies] = await Promise.all([
    prisma.inspection.findMany({
      where: { colony: { apiary: { userId: session!.user.id } } },
      include: { colony: { include: { apiary: { select: { id: true, name: true } } } }, items: true },
      orderBy: { date: 'desc' },
    }),
    prisma.colony.findMany({
      where: { apiary: { userId: session!.user.id } },
      include: { apiary: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Inspektionen</h1>
          <p className="text-zinc-500 text-[14px] mt-1">{inspections.length} Inspektion{inspections.length !== 1 ? 'en' : ''} gesamt</p>
        </div>
        <AddInspectionButton colonies={colonies} />
      </div>

      {inspections.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="12" y2="16" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-zinc-900">Noch keine Inspektionen</p>
          <p className="text-[13px] text-zinc-400 mt-1">Starte deine erste Stockkarte</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map((ins) => {
            const varroa = getVarroaFromItems(ins.items)
            const status = getStatusColor(varroa)
            const keyItems = ins.items.filter(i => ['population', 'temperament', 'vitality'].includes(i.key))

            return (
              <div key={ins.id} className="bg-white rounded-2xl shadow-sm px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                        <rect x="9" y="3" width="6" height="4" rx="1" />
                        <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="12" y2="16" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-zinc-900">{ins.colony.name}</p>
                      <p className="text-[12px] text-zinc-400 mt-0.5">{ins.colony.apiary.name} · {new Date(ins.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {varroa && (
                      <div className="text-right">
                        <p className="text-[11px] text-zinc-400">Varroa</p>
                        <p className="text-[13px] font-semibold text-zinc-700">{varroa}%</p>
                      </div>
                    )}
                    {status && (
                      <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${status.badge}`}>
                        {status.label}
                      </span>
                    )}
                    <InspectionRowMenu inspection={ins} colonies={colonies} />
                  </div>
                </div>

                {keyItems.length > 0 && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-zinc-50">
                    {keyItems.map(item => (
                      <div key={item.key} className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(n => (
                            <div key={n} className={`w-2.5 h-2.5 rounded-sm ${parseInt(item.value) >= n ? 'bg-amber-400' : 'bg-zinc-100'}`} />
                          ))}
                        </div>
                        <span className="text-[11px] text-zinc-400">{item.key === 'population' ? 'Stärke' : item.key === 'temperament' ? 'Sanftmut' : 'Vitalität'}</span>
                      </div>
                    ))}
                    {ins.notes && (
                      <p className="text-[12px] text-zinc-400 italic ml-auto truncate max-w-xs">{ins.notes}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
