'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Locale = 'de' | 'en'
const L = {
  de: { title: 'Passwort zurücksetzen', email: 'E-Mail-Adresse', submit: 'Link senden', success: 'Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link gesendet.', back: 'Zurück zum Login', new_pw: 'Neues Passwort', confirm: 'Passwort bestätigen', save: 'Passwort speichern', saved: 'Passwort gespeichert! Du kannst dich jetzt einloggen.', mismatch: 'Passwörter stimmen nicht überein', short: 'Mindestens 8 Zeichen' },
  en: { title: 'Reset Password', email: 'Email address', submit: 'Send link', success: "If an account with this email exists, we've sent you a link.", back: 'Back to login', new_pw: 'New password', confirm: 'Confirm password', save: 'Save password', saved: 'Password saved! You can now sign in.', mismatch: 'Passwords do not match', short: 'At least 8 characters' },
}

export default function PasswortVergessenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-zinc-400">...</div></div>}>
      <PasswortVergessenInner />
    </Suspense>
  )
}

function PasswortVergessenInner() {
  const searchParams = useSearchParams()
  const resetToken = searchParams.get('token')
  const [locale, setLocale] = useState<Locale>('de')
  const t = L[locale]

  useEffect(() => { const m = document.cookie.match(/shop-locale=([^;]*)/); if (m?.[1] === 'en') setLocale('en') }, [])

  if (resetToken) return <NewPasswordForm token={resetToken} t={t} />
  return <RequestResetForm t={t} />
}

function RequestResetForm({ t }: { t: Record<string, string> }) {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await fetch('/api/shop/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => {})
    setSent(true); setLoading(false)
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-amber-50/30">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-800 text-center mb-6">{t.title}</h1>
        {sent ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 text-center">
            <p className="text-zinc-700 mb-4">{t.success}</p>
            <Link href="/shop/login" className="text-amber-600 hover:text-amber-700 font-medium">{t.back}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
            <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.email}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
            <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl">{loading ? '...' : t.submit}</button>
            <p className="text-center text-sm"><Link href="/shop/login" className="text-amber-600">{t.back}</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}

function NewPasswordForm({ token, t }: { token: string; t: Record<string, string> }) {
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(''); const [saved, setSaved] = useState(false); const [loading, setLoading] = useState(false)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (password.length < 8) { setError(t.short); return }
    if (password !== confirm) { setError(t.mismatch); return }
    setLoading(true)
    const res = await fetch('/api/shop/auth/new-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setLoading(false); return }
    setSaved(true); setLoading(false)
  }
  if (saved) return (
    <div className="min-h-screen flex items-center justify-center px-4"><div className="text-center"><p className="text-zinc-700 mb-4">{t.saved}</p><Link href="/shop/login" className="text-amber-600 font-medium">{t.back}</Link></div></div>
  )
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-amber-50/30">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-800 text-center mb-6">{t.title}</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.new_pw}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.confirm}</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl">{loading ? '...' : t.save}</button>
        </form>
      </div>
    </div>
  )
}
