import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SettingsPageClient from '@/components/SettingsPageClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'admin'

  // Nutzerliste nur für Admins laden
  const users = isAdmin
    ? await prisma.user.findMany({
        select: { id: true, email: true, name: true },
        orderBy: { createdAt: 'asc' },
      })
    : []

  return (
    <SettingsPageClient
      users={users}
      currentUserEmail={session?.user?.email || undefined}
      isAdmin={isAdmin}
    />
  )
}
