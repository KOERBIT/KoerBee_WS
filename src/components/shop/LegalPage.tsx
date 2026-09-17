import Image from 'next/image'
import Link from 'next/link'

const footerLinks = [
  { href: '/shop', label: 'Shop' },
  { href: '/blog', label: 'Blog' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/widerruf', label: 'Widerruf' },
  { href: '/versand', label: 'Versand & Zahlung' },
]

export default function LegalPage({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--shop-bg)',
        color: 'var(--shop-ink)',
        fontFamily: 'var(--font-manrope), system-ui, sans-serif',
      }}
    >

      {/* Header */}
      <header className="px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={32} height={32} className="rounded-lg" style={{ objectFit: 'contain' }} />
            <span
              style={{
                fontFamily: 'var(--font-caveat), cursive',
                fontWeight: 700,
                fontSize: '1.6rem',
                color: 'var(--shop-ink)',
              }}
            >
              KörBee
            </span>
          </Link>
          <span
            style={{
              fontSize: '.68rem',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--shop-dim)',
            }}
          >
            Imkerei
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pb-16">
        <div
          className="max-w-3xl mx-auto rounded-[24px] p-8 sm:p-10"
          style={{
            background: 'var(--shop-panel)',
            border: '1px solid var(--shop-border)',
            boxShadow: 'var(--shop-shadow)',
          }}
        >
          <h1
            style={{
              fontWeight: 800,
              fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
              marginBottom: 24,
            }}
          >
            {title}
          </h1>
          <div
            className="legal-content"
            style={{
              fontSize: '.95rem',
              lineHeight: 1.75,
              color: 'var(--shop-dim)',
            }}
          >
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 py-10"
        style={{
          borderTop: '1px solid var(--shop-border)',
          fontSize: '.82rem',
          color: 'var(--shop-dim)',
        }}
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
              <Image src="/Koerbee_Logo.png" alt="KörBee" width={24} height={24} className="rounded-md" style={{ objectFit: 'contain' }} />
              <span
                style={{
                  fontFamily: 'var(--font-caveat), cursive',
                  fontWeight: 700,
                  fontSize: '1.4rem',
                  color: 'var(--shop-ink)',
                }}
              >
                KörBee
              </span>
            </Link>
            <span
              style={{
                fontSize: '.68rem',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              Imkerei
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-center">
            {footerLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}
                className="hover:opacity-70 transition-opacity"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              style={{
                color: 'var(--shop-dim)',
                textDecoration: 'none',
                opacity: 0.4,
                fontSize: '.72rem',
              }}
              className="hover:opacity-70 transition-opacity"
            >
              Verwaltung
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
