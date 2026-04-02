'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const MORE_ITEMS = [
  { label: 'Standorte', href: '/dashboard/apiaries', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
    </svg>
  )},
  { label: 'Behandlungen', href: '/dashboard/treatments', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
      <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
    </svg>
  )},
  { label: 'Kalender', href: '/dashboard/calendar', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { label: 'Zucht', href: '/dashboard/breeding', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
    </svg>
  )},
  { label: 'NFC-Tags', href: '/dashboard/nfc', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6"/>
      <path d="M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
    </svg>
  )},
  { label: 'Einstellungen', href: '/dashboard/settings', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )},
]

const NAV_ITEMS = [
  {
    label: 'Home',
    href: '/dashboard',
    exact: true,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    label: 'Völker',
    href: '/dashboard/colonies',
    exact: false,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    label: 'NFC',
    href: '/dashboard/nfc/scan',
    exact: false,
    icon: (_active: boolean) => (
      <div className="w-12 h-12 -mt-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-200">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6"/>
          <path d="M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6"/>
          <circle cx="12" cy="12" r="1" fill="white"/>
        </svg>
      </div>
    ),
  },
  {
    label: 'Inspekt.',
    href: '/dashboard/inspections',
    exact: false,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/>
      </svg>
    ),
  },
  {
    label: 'Mehr',
    href: null,
    exact: false,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const isMoreActive = MORE_ITEMS.some(i => pathname.startsWith(i.href))

  return (
    <>
      {/* More drawer */}
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-16 left-0 right-0 bg-white border-t border-zinc-100 rounded-t-2xl shadow-xl px-4 pt-4 pb-6"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {MORE_ITEMS.map(item => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-2 px-3 py-3 rounded-2xl transition-colors ${active ? 'bg-amber-50 text-amber-600' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                    {item.icon}
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-zinc-100 flex items-end justify-around px-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {NAV_ITEMS.map((item) => {
          const active = item.href
            ? (item.exact ? pathname === item.href : pathname.startsWith(item.href))
            : isMoreActive
          const isNfc = item.href === '/dashboard/nfc/scan'
          const isMore = item.label === 'Mehr'

          return isMore ? (
            <button key="mehr"
              onClick={() => setShowMore(v => !v)}
              className={`flex flex-col items-center gap-0.5 pt-2 pb-1 px-3 ${(showMore || isMoreActive) ? 'text-amber-600' : 'text-zinc-400'}`}>
              {item.icon(showMore || isMoreActive)}
              <span className={`text-[10px] font-medium leading-none ${(showMore || isMoreActive) ? 'text-amber-600' : 'text-zinc-400'}`}>
                Mehr
              </span>
            </button>
          ) : (
            <Link key={item.href!} href={item.href!}
              onClick={() => setShowMore(false)}
              className={`flex flex-col items-center gap-0.5 pt-2 pb-1 px-3 min-w-0 ${isNfc ? '' : active ? 'text-amber-600' : 'text-zinc-400'}`}>
              {item.icon(active)}
              {!isNfc && (
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-amber-600' : 'text-zinc-400'}`}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
