'use client'

import type { Locale } from '@/lib/shop/i18n'

// Gleicher Cookie wie überall im Shop → Sprachwahl gilt seitenweit.
// Neu laden, weil Server- und Client-Seiten den Cookie beim Laden lesen.
function selectLocale(next: Locale, current: Locale) {
  if (next === current) return
  document.cookie = `shop-locale=${next};path=/;max-age=${365 * 86400}`
  window.location.reload()
}

export default function LanguageToggle({ locale, floating = false }: { locale: Locale; floating?: boolean }) {
  return (
    <div
      className={`flex p-0.5 gap-0.5 rounded-full text-[11px] font-bold shrink-0 ${floating ? 'fixed top-4 right-4 z-50' : ''}`}
      style={{
        background: 'var(--shop-panel)',
        border: '1px solid var(--shop-border)',
        boxShadow: floating ? 'var(--shop-shadow)' : undefined,
      }}
      role="group"
      aria-label="Sprache / Language"
    >
      {(['de', 'en'] as Locale[]).map(l => (
        <button
          key={l}
          type="button"
          onClick={() => selectLocale(l, locale)}
          aria-pressed={locale === l}
          className="px-2.5 py-1 rounded-full transition-colors"
          style={locale === l ? { background: 'var(--shop-ink)', color: 'var(--shop-bg)' } : { color: 'var(--shop-dim)' }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
