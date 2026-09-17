import type { Metadata, Viewport } from 'next'
import BeeMascot from '@/components/mascot/BeeMascot'

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

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--shop-bg)', color: 'var(--shop-ink)', fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
      {children}
      <BeeMascot />
    </div>
  )
}
