'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Customer { id: string; name: string; email: string; locale: string }

export default function KontoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const locale = customer?.locale === 'en' ? 'en' : 'de'

  useEffect(() => {
    fetch('/api/shop/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setCustomer)
      .catch(() => router.push('/shop/login?callbackUrl=/shop/konto'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-zinc-400">...</div></div>

  async function logout() {
    await fetch('/api/shop/auth/logout', { method: 'POST' })
    router.push('/shop')
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/shop" className="text-lg font-bold text-amber-800">KörBee</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop/produkte" className="text-zinc-600 hover:text-amber-700">{locale === 'de' ? 'Produkte' : 'Products'}</Link>
            <Link href="/shop/konto" className="text-amber-700 font-medium">{locale === 'de' ? 'Bestellungen' : 'Orders'}</Link>
            <Link href="/shop/konto/profil" className="text-zinc-600 hover:text-amber-700">{locale === 'de' ? 'Profil' : 'Profile'}</Link>
            <button onClick={logout} className="text-zinc-400 hover:text-zinc-600">{locale === 'de' ? 'Abmelden' : 'Sign out'}</button>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </>
  )
}
