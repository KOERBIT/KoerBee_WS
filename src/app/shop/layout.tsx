import type { Metadata, Viewport } from 'next'
import BeeMascot from '@/components/mascot/BeeMascot'
import ShopTracker from '@/components/shop/ShopTracker'
import HoneyDripBackground from '@/components/shop/HoneyDripBackground'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Imkerei-Shop | KörBee',
  description: 'Frische Imkereiprodukte vorbestellen — direkt vom Imker',
  manifest: '/manifest-shop.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KörBee Shop',
  },
}

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const videoEntry = await prisma.cmsContent.findUnique({
    where: { key_locale: { key: 'hero.video', locale: 'de' } },
    select: { value: true },
  })

  return (
    <>
      <HoneyDripBackground videoUrl={videoEntry?.value || undefined} />
      <div className="relative min-h-screen flex flex-col" style={{ background: 'var(--shop-bg)', color: 'var(--shop-ink)', fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
        {children}
        <BeeMascot />
        <ShopTracker />
      </div>
    </>
  )
}
