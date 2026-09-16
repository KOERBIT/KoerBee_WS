'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Locale = 'de' | 'en'
const L = {
  de: { title: 'Registrieren', name: 'Name', email: 'E-Mail-Adresse', phone: 'Telefon (optional)', password: 'Passwort', confirm: 'Passwort bestätigen', submit: 'Konto erstellen', has_account: 'Bereits ein Konto?', login: 'Jetzt einloggen', mismatch: 'Passwörter stimmen nicht überein', exists: 'Diese E-Mail ist bereits registriert', short: 'Passwort muss mindestens 8 Zeichen lang sein', success: 'Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.' },
  en: { title: 'Register', name: 'Name', email: 'Email address', phone: 'Phone (optional)', password: 'Password', confirm: 'Confirm password', submit: 'Create account', has_account: 'Already have an account?', login: 'Sign in', mismatch: 'Passwords do not match', exists: 'This email is already registered', short: 'Password must be at least 8 characters', success: 'Registration successful! Please verify your email address.' },
}

export default function ShopRegisterPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('de')
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState(''); const [error, setError] = useState('')
  const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false)
  const t = L[locale]

  useEffect(() => { const m = document.cookie.match(/shop-locale=([^;]*)/); if (m?.[1] === 'en') setLocale('en') }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (password.length < 8) { setError(t.short); return }
    if (password !== confirm) { setError(t.mismatch); return }
    setLoading(true)
    try {
      const res = await fetch('/api/shop/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone: phone || undefined, locale }),
      })
      if (res.status === 409) { setError(t.exists); return }
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
      setSuccess(true)
      setTimeout(() => router.push('/shop/konto'), 2000)
    } catch { setError('Error') }
    finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center"><div className="text-4xl mb-4">📧</div><p className="text-zinc-700">{t.success}</p></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-amber-50/30">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-800 text-center mb-6">{t.title}</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.name}</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.email}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.phone}</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.password}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.confirm}</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl transition-colors">{loading ? '...' : t.submit}</button>
          <p className="text-center text-sm text-zinc-500">{t.has_account} <Link href="/shop/login" className="text-amber-600 hover:text-amber-700 font-medium">{t.login}</Link></p>
        </form>
      </div>
    </div>
  )
}
