import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Blog | KörBee Imkerei',
  description: 'Neuigkeiten aus der Imkerei — Saisonberichte, Rezepte und Tipps',
}

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--shop-bg)', color: 'var(--shop-ink)', fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
