'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ShopTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    const timeout = setTimeout(() => {
      fetch('/api/shop/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer || undefined,
        }),
      }).catch(() => {})
    }, 300)

    return () => clearTimeout(timeout)
  }, [pathname])

  return null
}
