import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AddTreatmentButton } from './TreatmentActions'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  varroa:       { label: 'Varroabehandlung', color: 'bg-rose-100 text-rose-700' },
  feeding:      { label: 'Fütterung',        color: 'bg-green-100 text-green-700' },
  oxalic_acid:  { label: 'Oxalsäure',        color: 'bg-blue-100 text-blue-700' },
  formic_acid:  { label: 'Ameisensäure',     color: 'bg-purple-100 text-purple-700' },
  thymol:       { label: 'Thymol',           color: 'bg-teal-100 text-teal-700' },
  antibiotic:   { label: 'Antibiotikum',     color: 'bg-orange-100 text-orange-700' },
  other:        { label: 'Sonstiges',        color: 'bg-zinc-100 text-zinc-600' },
}

export default async function TreatmentsPage() {
  const session = await getServerSession(authOptions)

  const [treatments, colonies] = await Promise.all([
    prisma.treatment.findMany({
      where: { colony: { apiary: { userId: session!.user.id } } },
      include: { colony: { include: { apiary: { select: { id: true, name: true } } } } },
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Behandlungen</h1>
          <p className="text-zinc-500 text-[14px] mt-1">{treatments.length} Behandlung{treatments.length !== 1 ? 'en' : ''} gesamt</p>
        </div>
        <AddTreatmentButton colonies={colonies} />
      </div>

      {treatments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
              <line x1="12" y1="14" x2="12" y2="18" /><line x1="10" y1="16" x2="14" y2="16" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-zinc-900">Noch keine Behandlungen</p>
          <p className="text-[13px] text-zinc-400 mt-1">Dokumentiere Varroa-Behandlungen und Fütterungen</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Art</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Volk</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Menge</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Datum</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Notizen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {treatments.map((t) => {
                const meta = TYPE_LABELS[t.type] ?? { label: t.type, color: 'bg-zinc-100 text-zinc-600' }
                return (
                  <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[14px] font-medium text-zinc-900">{t.colony.name}</p>
                      <p className="text-[12px] text-zinc-400">{t.colony.apiary.name}</p>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-zinc-600">
                      {t.amount ? `${t.amount} ${t.unit ?? ''}` : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-[13px] text-zinc-500">
                      {new Date(t.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-[13px] text-zinc-400 max-w-xs truncate">
                      {t.notes ?? <span className="text-zinc-200">—</span>}
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
