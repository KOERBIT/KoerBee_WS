'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: 'Völker',
    href: '/dashboard/colonies',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    label: 'NFC',
    href: '/dashboard/nfc/scan',
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
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="12" y2="16"/>
      </svg>
    ),
  },
  {
    label: 'Mehr',
    href: '/dashboard/apiaries',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-zinc-100 flex items-end justify-around px-2 pb-safe"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
      {navItems.map((item) => {
        const active = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
        const isNfc = item.href === '/dashboard/nfc/scan'

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 pt-2 pb-1 px-3 min-w-0 ${
              isNfc ? '' : active ? 'text-amber-600' : 'text-zinc-400'
            }`}
          >
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
  )
}
