'use client'

import { useState, useEffect, useRef } from 'react'
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
      <section id="produkte" className="max-w-5xl mx-auto px-6 pb-20 w-full">
        <FadeIn>
          <div className="text-center mb-10">
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
          </div>
        </FadeIn>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p, i) => {
              const name = p.shopName ?? p.name
              return (
                <FadeIn key={p.id} delay={i * 80}>
                  <div
                    className="rounded-[20px] overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1"
                    style={{
                      background: 'var(--shop-panel)',
                      border: '1px solid var(--shop-border)',
                      boxShadow: 'var(--shop-shadow)',
                    }}
                  >
                    {p.imageUrl ? (
                      <div className="h-48" style={{ background: 'var(--shop-cream)' }}>
                        <img src={p.imageUrl} alt={name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className="h-48 flex items-center justify-center text-5xl"
                        style={{ background: 'var(--shop-cream)' }}
                      >
                        🍯
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1 gap-2">
                      <h3 className="font-bold text-[.98rem]" style={{ color: 'var(--shop-ink)' }}>
                        {name}
                      </h3>
                      {p.description && (
                        <p
                          className="text-[.78rem] leading-relaxed line-clamp-2"
                          style={{ color: 'var(--shop-dim)' }}
                        >
                          {p.description}
                        </p>
                      )}
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 500,
                            fontSize: '.92rem',
                          }}
                        >
                          {(p.shopPrice ?? p.price).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                          <span className="text-xs ml-1" style={{ color: 'var(--shop-dim)' }}>
                            / {p.unit}
                          </span>
                        </span>
                        <Link
                          href="/shop/produkte"
                          className="transition-all duration-150 active:scale-[.92]"
                          style={{
                            background: 'var(--shop-ink)',
                            color: 'var(--shop-bg)',
                            fontWeight: 700,
                            fontSize: '.78rem',
                            padding: '8px 14px',
                            borderRadius: 999,
                            textDecoration: 'none',
                          }}
                        >
                          Zum Shop
                        </Link>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        ) : (
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
