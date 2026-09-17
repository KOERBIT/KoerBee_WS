import type { Metadata, Viewport } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'KörBee — Imkerei-Verwaltung',
  description: 'Verwalte deine Bienenvölker, Standorte und Inspektionen',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KörBee Imker',
  },
}

export const viewport: Viewport = {
  themeColor: '#f59e0b',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
