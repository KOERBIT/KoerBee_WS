import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { AddApiaryButton, ApiaryRowActions } from './ApiaryActions'

export default async function ApiarysPage() {
  const session = await getServerSession(authOptions)

  const apiaries = await prisma.apiary.findMany({
    where: { userId: session!.user.id, status: 'active' },
    include: { _count: { select: { colonies: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Standorte</h1>
          <p className="text-zinc-500 text-[14px] mt-1">{apiaries.length} Standort{apiaries.length !== 1 ? 'e' : ''} gesamt</p>
        </div>
        <AddApiaryButton />
      </div>

      {apiaries.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-zinc-900">Noch keine Standorte</p>
          <p className="text-[13px] text-zinc-400 mt-1">Füge deinen ersten Standort hinzu</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Koordinaten</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Völker</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Notizen</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {apiaries.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50 transition-colors group">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/apiaries/${a.id}`} className="font-medium text-[14px] text-zinc-900 hover:text-amber-600 transition-colors">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-zinc-500">
                    {a.lat && a.lng ? `${a.lat.toFixed(4)}°, ${a.lng.toFixed(4)}°` : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      {a._count.colonies}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-zinc-500 max-w-xs truncate">
                    {a.notes ?? <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <ApiaryRowActions apiary={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
