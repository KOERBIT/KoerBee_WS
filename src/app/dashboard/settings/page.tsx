import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SettingsPageClient from '@/components/SettingsPageClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  // Fetch all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <SettingsPageClient
      users={users}
      currentUserEmail={session?.user?.email}
    />
  )
}
