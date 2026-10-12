import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import HeroAnimation from '@/components/landing/HeroAnimation'
import ShopTracker from '@/components/shop/ShopTracker'
import HoneyDripBackground from '@/components/shop/HoneyDripBackground'
import { getHeroMedia } from '@/lib/hero-media-server'

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
  const { videoUrl, animation, soundUrl } = await getHeroMedia()
  const locale = (await cookies()).get('shop-locale')?.value === 'en' ? 'en' : 'de'

  return (
    <>
      <HoneyDripBackground videoUrl={videoUrl} />
      <div className="relative min-h-screen flex flex-col" style={{ background: 'var(--shop-bg)', color: 'var(--shop-ink)', fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
        {children}
        <HeroAnimation animation={animation} locale={locale} soundUrl={soundUrl} />
        <ShopTracker />
      </div>
    </>
  )
}
