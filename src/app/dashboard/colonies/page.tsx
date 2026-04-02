import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { AddColonyButton, ColonyRowActions } from './ColonyActions'

const QUEEN_COLOR_DOT: Record<string, string> = {
  weiß:  'bg-white border border-zinc-300',
  gelb:  'bg-yellow-400',
  rot:   'bg-red-500',
  grün:  'bg-green-500',
  blau:  'bg-blue-500',
}

export default async function ColoniesPage() {
  const session = await getServerSession(authOptions)

  const [colonies, apiaries] = await Promise.all([
    prisma.colony.findMany({
      where: { apiary: { userId: session!.user.id }, status: 'active' },
      include: {
        apiary: { select: { id: true, name: true } },
        _count: { select: { inspections: true, treatments: true } },
        inspections: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.apiary.findMany({ where: { userId: session!.user.id }, select: { id: true, name: true } }),
  ])

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Völker</h1>
          <p className="text-zinc-500 text-[14px] mt-1">{colonies.length} Volk{colonies.length !== 1 ? '' : ''} gesamt</p>
        </div>
        <AddColonyButton apiaries={apiaries} />
      </div>

      {colonies.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-zinc-900">Noch keine Völker</p>
          <p className="text-[13px] text-zinc-400 mt-1">Lege deinen ersten Bienenvolk an</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Volk</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Standort</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Königin</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Letzte Inspektion</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Aktivität</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {colonies.map((c) => {
                const lastInspection = c.inspections[0]
                return (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/colonies/${c.id}`} className="font-medium text-[14px] text-zinc-900 hover:text-amber-600 transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/apiaries/${c.apiary.id}`} className="text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors">
                        {c.apiary.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {c.queenColor && (
                          <span className={`w-3 h-3 rounded-full shrink-0 ${QUEEN_COLOR_DOT[c.queenColor] ?? 'bg-zinc-300'}`} />
                        )}
                        <span className="text-[13px] text-zinc-600">
                          {c.queenYear ?? <span className="text-zinc-300">—</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-zinc-500">
                      {lastInspection
                        ? new Date(lastInspection.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span className="text-zinc-300">Noch keine</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 text-[12px] text-zinc-400">
                        <span>{c._count.inspections} Insp.</span>
                        <span>{c._count.treatments} Beh.</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <ColonyRowActions colony={c} apiaries={apiaries} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
