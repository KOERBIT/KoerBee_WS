import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { NfcTagManager } from './NfcTagManager'
import { NfcTagList } from './NfcTagList'

export default async function NfcPage() {
  const session = await getServerSession(authOptions)

  const [tags, colonies] = await Promise.all([
    prisma.nfcTag.findMany({
      where: { colony: { apiary: { userId: session!.user.id } } },
      include: {
        colony: { include: { apiary: { select: { id: true, name: true } } } },
        actions: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.colony.findMany({
      where: { apiary: { userId: session!.user.id }, status: 'active' },
      include: { apiary: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">NFC-Tags</h1>
          <p className="text-zinc-500 text-[14px] mt-1">{tags.length} Tag{tags.length !== 1 ? 's' : ''} registriert</p>
        </div>
        <div className="flex items-center gap-3">
          <NfcTagManager colonies={colonies} />
          <Link href="/dashboard/nfc/scan"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6"/>
              <circle cx="12" cy="12" r="1" fill="currentColor"/>
            </svg>
            Tag scannen
          </Link>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <p className="text-[13px] font-medium text-blue-800">So funktioniert NFC</p>
          <p className="text-[12px] text-blue-600 mt-0.5">
            1. Tag registrieren → Volk + Aktionen zuordnen &nbsp;·&nbsp;
            2. Am Stock scannen → Aktion wird automatisch gebucht &nbsp;·&nbsp;
            NFC-Scan funktioniert auf Android (Chrome). iOS: UID manuell eingeben.
          </p>
        </div>
      </div>

      <NfcTagList tags={tags} />
    </div>
  )
}
