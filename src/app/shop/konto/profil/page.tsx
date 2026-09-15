'use client'

import { useState, useEffect } from 'react'

interface Customer { id: string; name: string; email: string; phone: string | null; locale: string }

export default function ProfilPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState(''); const [phone, setPhone] = useState('')
  const [locale, setLocale] = useState('de')
  const [password, setPassword] = useState(''); const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const l = locale === 'en' ? 'en' : 'de'

  useEffect(() => {
    fetch('/api/shop/auth/me').then(r => r.json()).then((c: Customer) => {
      setCustomer(c); setName(c.name); setPhone(c.phone ?? ''); setLocale(c.locale)
    }).catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaved(false); setSaving(true)
    if (password && password.length < 8) { setError(l === 'de' ? 'Mindestens 8 Zeichen' : 'At least 8 characters'); setSaving(false); return }
    if (password && password !== confirmPw) { setError(l === 'de' ? 'Passwörter stimmen nicht überein' : 'Passwords do not match'); setSaving(false); return }
    const res = await fetch('/api/shop/auth/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone: phone || null, locale, ...(password ? { password } : {}) }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error') }
    else {
      setSaved(true); setPassword(''); setConfirmPw('')
      document.cookie = `shop-locale=${locale};path=/;max-age=${365 * 86400}`
    }
    setSaving(false)
  }

  if (!customer) return null

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">{l === 'de' ? 'Profil' : 'Profile'}</h1>
      <form onSubmit={save} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4 max-w-md">
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Name' : 'Name'}</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">E-Mail</label><input type="email" value={customer.email} disabled className="w-full border border-zinc-100 bg-zinc-50 rounded-xl px-3 py-2 text-sm text-zinc-400" /></div>
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Telefon' : 'Phone'}</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Sprache' : 'Language'}</label><select value={locale} onChange={e => setLocale(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"><option value="de">Deutsch</option><option value="en">English</option></select></div>
        <hr className="border-zinc-100" />
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Neues Passwort (optional)' : 'New password (optional)'}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
        {password && <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Bestätigen' : 'Confirm'}</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>}
        {error && <p className="text-rose-600 text-sm">{error}</p>}
        {saved && <p className="text-green-600 text-sm">{l === 'de' ? 'Gespeichert!' : 'Saved!'}</p>}
        <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold px-6 py-2.5 rounded-xl">{saving ? '...' : l === 'de' ? 'Speichern' : 'Save'}</button>
      </form>
    </>
  )
}
