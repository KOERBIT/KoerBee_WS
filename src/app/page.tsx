'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const BeeMascot = dynamic(() => import('@/components/mascot/BeeMascot3D'), { ssr: false })

interface ShopProduct {
  id: string
  name: string
  shopName: string | null
  shopNameEn: string | null
  description: string | null
  imageUrl: string | null
  price: number
  shopPrice: number | null
  unit: string
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ── Apple-style scroll-driven product showcase ── */
function ProductShowcase({ product, index }: { product: ShopProduct; index: number }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  const handleScroll = useCallback(() => {
    const el = sectionRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    // progress: 0 = section just entering bottom, 1 = centered, back to 0 = leaving top
    const center = rect.top + rect.height / 2
    const dist = Math.abs(center - vh / 2)
    const maxDist = vh / 2 + rect.height / 2
    const p = Math.max(0, 1 - dist / maxDist)
    setProgress(p)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const name = product.shopName ?? product.name
  // Eased progress for smoother feel
  const ease = progress * progress * (3 - 2 * progress) // smoothstep
  const imgScale = 0.85 + ease * 0.15
  const textOpacity = Math.max(0, (ease - 0.25) / 0.75)
  const textY = (1 - ease) * 40
  const cardRadius = 28 + (1 - ease) * 12
  const isEven = index % 2 === 0

  return (
    <div
      ref={sectionRef}
      className="flex items-center justify-center px-4 sm:px-8"
      style={{ minHeight: '85vh', scrollSnapAlign: 'center' }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          maxWidth: 900,
          borderRadius: cardRadius,
          border: '1px solid var(--shop-border)',
          background: 'var(--shop-panel)',
          boxShadow: `0 ${4 + ease * 20}px ${20 + ease * 40}px rgba(0,0,0,${0.04 + ease * 0.06})`,
          transform: `scale(${0.95 + ease * 0.05})`,
          transition: 'box-shadow .3s',
        }}
      >
        {/* Two-part layout: image + text, alternating sides */}
        <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
          {/* Image */}
          <div
            className="relative overflow-hidden md:w-1/2"
            style={{ minHeight: 320 }}
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: `scale(${imgScale})`,
                  transition: 'transform .1s linear',
                }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--shop-cream) 0%, var(--shop-sky-bottom) 100%)',
                  transform: `scale(${imgScale})`,
                  transition: 'transform .1s linear',
                }}
              >
                <span style={{ fontSize: 'clamp(4rem, 8vw, 7rem)', filter: `blur(${(1 - ease) * 2}px)` }}>
                  {['🍯', '🐝', '🪻', '🌻'][index % 4]}
                </span>
              </div>
            )}
            {/* Gradient overlay toward text side */}
            <div
              className={`absolute inset-0 pointer-events-none hidden md:block`}
              style={{
                background: isEven
                  ? 'linear-gradient(to right, transparent 60%, var(--shop-panel) 100%)'
                  : 'linear-gradient(to left, transparent 60%, var(--shop-panel) 100%)',
              }}
            />
            {/* Bottom gradient for mobile */}
            <div
              className="absolute inset-0 pointer-events-none md:hidden"
              style={{
                background: 'linear-gradient(to bottom, transparent 50%, var(--shop-panel) 100%)',
              }}
            />
          </div>

          {/* Text content */}
          <div
            className="relative md:w-1/2 flex flex-col justify-center p-8 sm:p-12"
            style={{
              opacity: textOpacity,
              transform: `translateY(${textY}px)`,
              transition: 'opacity .15s, transform .15s',
            }}
          >
            <p
              style={{
                fontFamily: "'Caveat', cursive",
                fontWeight: 700,
                fontSize: '1.1rem',
                color: 'var(--shop-accent)',
                marginBottom: 4,
              }}
            >
              Produkt {String(index + 1).padStart(2, '0')}
            </p>
            <h3
              style={{
                fontWeight: 800,
                fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
                lineHeight: 1.15,
                marginBottom: 16,
                color: 'var(--shop-ink)',
              }}
            >
              {name}
            </h3>
            {product.description && (
              <p
                style={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  color: 'var(--shop-dim)',
                  marginBottom: 24,
                  maxWidth: 380,
                }}
              >
                {product.description}
              </p>
            )}
            <div className="flex items-center gap-5 flex-wrap">
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 500,
                  fontSize: '1.3rem',
                }}
              >
                {(product.shopPrice ?? product.price).toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                })}
                <span
                  className="ml-1"
                  style={{ fontSize: '.75rem', color: 'var(--shop-dim)', fontWeight: 400 }}
                >
                  / {product.unit}
                </span>
              </span>
              <Link
                href="/shop/produkte"
                className="transition-all duration-150 active:scale-[.92] hover:opacity-90"
                style={{
                  background: 'var(--shop-ink)',
                  color: 'var(--shop-bg)',
                  fontWeight: 700,
                  fontSize: '.85rem',
                  padding: '12px 24px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Zum Shop
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [products, setProducts] = useState<ShopProduct[]>([])

  useEffect(() => {
    fetch('/api/shop/products')
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--shop-bg)',
        color: 'var(--shop-ink)',
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap"
      />

      {/* 3D Bee */}
      <BeeMascot />

      {/* ─── Hero ─── */}
      <section
        id="shop-hero"
        className="relative mx-4 mt-6 overflow-hidden"
        style={{
          minHeight: 420,
          borderRadius: 28,
          border: '1px solid var(--shop-border)',
          background: 'linear-gradient(180deg, var(--shop-sky-top) 0%, var(--shop-sky-bottom) 100%)',
          boxShadow: 'inset 0 0 0 6px var(--shop-panel), var(--shop-shadow)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 18% 82%, rgba(255,255,255,.5) 0, rgba(255,255,255,0) 42%), radial-gradient(circle at 85% 20%, rgba(255,255,255,.35) 0, rgba(255,255,255,0) 38%)',
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
          <FadeIn>
            <p
              className="mb-2"
              style={{
                fontFamily: "'Caveat', cursive",
                fontWeight: 700,
                fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
                color: 'var(--shop-accent)',
              }}
            >
              KörBee Imkerei
            </p>
          </FadeIn>
          <FadeIn delay={100}>
            <h1
              style={{
                fontWeight: 800,
                fontSize: 'clamp(2.2rem, 5.5vw, 3.6rem)',
                lineHeight: 1.1,
                color: '#2a1f0a',
                marginBottom: 12,
              }}
            >
              Frisch vom Stock.
            </h1>
          </FadeIn>
          <FadeIn delay={200}>
            <p
              className="max-w-lg"
              style={{ fontSize: '1.08rem', color: '#43391f', lineHeight: 1.6, marginBottom: 28 }}
            >
              Honig, Wachs & mehr — direkt vom Imker.
              <br />
              Ehrliche Produkte, faire Preise.
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <a
              href="#produkte"
              className="transition-all duration-150 active:scale-[.92] hover:opacity-90"
              style={{
                background: 'var(--shop-ink)',
                color: 'var(--shop-bg)',
                fontWeight: 700,
                fontSize: '.92rem',
                padding: '13px 30px',
                borderRadius: 999,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Produkte entdecken
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ─── Über mich ─── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <FadeIn>
          <div
            className="rounded-[24px] p-8 sm:p-10"
            style={{
              background: 'var(--shop-panel)',
              border: '1px solid var(--shop-border)',
              boxShadow: 'var(--shop-shadow)',
            }}
          >
            <p
              style={{
                fontFamily: "'Caveat', cursive",
                fontWeight: 700,
                fontSize: '1.6rem',
                color: 'var(--shop-accent)',
                marginBottom: 6,
              }}
            >
              Hallo, ich bin der Imker.
            </p>
            <h2
              style={{
                fontWeight: 800,
                fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                marginBottom: 16,
              }}
            >
              Leidenschaft für Bienen & Natur
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--shop-dim)' }}>
              Was als Hobby begann, ist heute meine Berufung. Meine Bienenvölker stehen an
              sorgfältig ausgewählten Standorten — umgeben von Wiesen, Wäldern und Obstbäumen.
              Jedes Glas Honig erzählt die Geschichte seiner Tracht.
            </p>
            <p
              className="mt-4"
              style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--shop-dim)' }}
            >
              Mir ist wichtig, dass meine Produkte natürlich, unbehandelt und ehrlich sind.
              Keine Tricks, keine Zusätze — nur das, was die Bienen uns schenken.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── Produkte ─── */}
      <section id="produkte" className="w-full">
        {/* Section header */}
        <div className="text-center pt-10 pb-4 px-6">
          <FadeIn>
            <p
              style={{
                fontFamily: "'Caveat', cursive",
                fontWeight: 700,
                fontSize: '1.3rem',
                color: 'var(--shop-accent)',
                marginBottom: 4,
              }}
            >
              Aus dem Stock
            </p>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)' }}>
              Unsere Produkte
            </h2>
          </FadeIn>
        </div>

        {products.length > 0 ? (
          <div
            className="flex flex-col gap-0"
            style={{ scrollSnapType: 'y proximity' }}
          >
            {products.map((p, i) => (
              <ProductShowcase key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 pb-20">
            <FadeIn>
              <div
                className="text-center py-16 rounded-[20px]"
                style={{
                  background: 'var(--shop-panel)',
                  border: '1px solid var(--shop-border)',
                  color: 'var(--shop-dim)',
                }}
              >
                <p className="text-4xl mb-3">🐝</p>
                <p>Produkte werden bald hinzugefügt.</p>
              </div>
            </FadeIn>
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer
        className="mt-auto px-6 py-10"
        style={{
          borderTop: '1px solid var(--shop-border)',
          fontSize: '.82rem',
          color: 'var(--shop-dim)',
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <span
              style={{
                fontFamily: "'Caveat', cursive",
                fontWeight: 700,
                fontSize: '1.4rem',
                color: 'var(--shop-ink)',
              }}
            >
              KörBee
            </span>
            <span style={{ fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Imkerei
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-center">
            <Link
              href="/shop"
              style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}
              className="hover:opacity-70 transition-opacity"
            >
              Shop
            </Link>
            <Link
              href="/kontakt"
              style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}
              className="hover:opacity-70 transition-opacity"
            >
              Kontakt
            </Link>
            <Link
              href="/impressum"
              style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}
              className="hover:opacity-70 transition-opacity"
            >
              Impressum
            </Link>
            <Link
              href="/datenschutz"
              style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}
              className="hover:opacity-70 transition-opacity"
            >
              Datenschutz
            </Link>
            <Link
              href="/widerruf"
              style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}
              className="hover:opacity-70 transition-opacity"
            >
              Widerruf
            </Link>
            <Link
              href="/versand"
              style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}
              className="hover:opacity-70 transition-opacity"
            >
              Versand & Zahlung
            </Link>
            <Link
              href="/login"
              style={{ color: 'var(--shop-dim)', textDecoration: 'none', opacity: 0.4, fontSize: '.72rem' }}
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
