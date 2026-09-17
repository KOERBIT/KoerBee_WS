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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--shop-bg)', color: 'var(--shop-ink)', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Manrope:wght@400;500;600;700;800&display=swap" />
      {children}
    </div>
  )
}
