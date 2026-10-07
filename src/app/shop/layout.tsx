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
  let videoUrl: string | undefined
  let mascotModell: string | undefined
  try {
    const [videoEntry, mascotEntry] = await Promise.all([
      prisma.cmsContent.findUnique({
        where: { key_locale: { key: 'hero.video', locale: 'de' } },
        select: { value: true },
      }),
      prisma.cmsContent.findUnique({
        where: { key_locale: { key: 'mascot.modell', locale: 'de' } },
        select: { value: true },
      }),
    ])
    videoUrl = videoEntry?.value || undefined
    mascotModell = mascotEntry?.value || undefined
  } catch { /* DB unreachable */ }

  return (
    <>
      <HoneyDripBackground videoUrl={videoUrl} />
      <div className="relative min-h-screen flex flex-col" style={{ background: 'var(--shop-bg)', color: 'var(--shop-ink)', fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
        {children}
        <BeeMascot modell={mascotModell} />
        <ShopTracker />
      </div>
    </>
  )
}
