import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function NfcPage() {
  const session = await getServerSession(authOptions)

  const tags = await prisma.nfcTag.findMany({
    where: { colony: { apiary: { userId: session!.user.id } } },
    include: {
      colony: { include: { apiary: { select: { id: true, name: true } } } },
      actions: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">NFC-Tags</h1>
          <p className="text-zinc-500 text-[14px] mt-1">{tags.length} Tag{tags.length !== 1 ? 's' : ''} registriert</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p className="text-[13px] font-medium text-blue-800">NFC-Scanning via Web NFC API</p>
          <p className="text-[12px] text-blue-600 mt-0.5">Funktioniert auf Android mit Chrome. Halte dein Telefon an einen NFC-Chip um das Volk zu öffnen oder eine Inspektion zu starten.</p>
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6" />
              <circle cx="12" cy="12" r="1" fill="#3b82f6" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-zinc-900">Noch keine NFC-Tags</p>
          <p className="text-[13px] text-zinc-400 mt-1">Tags werden automatisch angelegt wenn ein Chip gescannt wird</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Chip-UID</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Label</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Volk</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Standort</th>
                <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-4">
                    <code className="text-[12px] bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg">{tag.uid}</code>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-zinc-600">{tag.label ?? <span className="text-zinc-300">—</span>}</td>
                  <td className="px-5 py-4 text-[14px] font-medium text-zinc-900">{tag.colony.name}</td>
                  <td className="px-5 py-4 text-[13px] text-zinc-500">{tag.colony.apiary.name}</td>
                  <td className="px-5 py-4">
                    <span className="text-[12px] text-zinc-400">{tag.actions.length} Aktion{tag.actions.length !== 1 ? 'en' : ''}</span>
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
