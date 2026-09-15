'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Locale = 'de' | 'en'
const L = {
  de: { title: 'Anmelden', email: 'E-Mail-Adresse', password: 'Passwort', submit: 'Einloggen', no_account: 'Noch kein Konto?', register: 'Jetzt registrieren', forgot: 'Passwort vergessen?', error: 'E-Mail oder Passwort falsch', verified: 'E-Mail bestätigt! Du kannst dich jetzt einloggen.' },
  en: { title: 'Sign In', email: 'Email address', password: 'Password', submit: 'Sign in', no_account: 'No account yet?', register: 'Register now', forgot: 'Forgot password?', error: 'Invalid email or password', verified: 'Email verified! You can now sign in.' },
}

export default function ShopLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/shop/konto'
  const verified = searchParams.get('verified')
  const [locale, setLocale] = useState<Locale>('de')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const t = L[locale]

  useEffect(() => {
    const m = document.cookie.match(/shop-locale=([^;]*)/)
    if (m?.[1] === 'en') setLocale('en')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/shop/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) { setError(t.error); return }
      router.push(callbackUrl)
    } catch { setError(t.error) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-amber-50/30">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-800 text-center mb-6">{t.title}</h1>
        {verified && <p className="mb-4 text-green-600 text-sm text-center bg-green-50 border border-green-200 rounded-xl p-3">{t.verified}</p>}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">{t.email}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">{t.password}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl transition-colors">
            {loading ? '...' : t.submit}
          </button>
          <div className="text-center text-sm text-zinc-500 space-y-1">
            <p>{t.no_account} <Link href="/shop/registrieren" className="text-amber-600 hover:text-amber-700 font-medium">{t.register}</Link></p>
            <p><Link href="/shop/passwort-vergessen" className="text-amber-600 hover:text-amber-700">{t.forgot}</Link></p>
          </div>
        </form>
      </div>
    </div>
  )
}
