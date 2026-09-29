'use client'

import { useState, useEffect } from 'react'

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  locale: string
  emailVerified: boolean
  createdAt: string
  _count: { preOrders: number }
}

export default function KundenPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/customers').then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
  }, [])

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Shop-Kunden</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-sm text-zinc-500">Gesamt</p>
          <p className="text-2xl font-bold text-zinc-800">{customers.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-sm text-zinc-500">Verifiziert</p>
          <p className="text-2xl font-bold text-green-600">{customers.filter(c => c.emailVerified).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-sm text-zinc-500">Nicht verifiziert</p>
          <p className="text-2xl font-bold text-amber-600">{customers.filter(c => !c.emailVerified).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-sm text-zinc-500">Mit Bestellungen</p>
          <p className="text-2xl font-bold text-blue-600">{customers.filter(c => c._count.preOrders > 0).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suche (Name, E-Mail)..."
          className="border border-zinc-200 rounded-xl px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-zinc-500 text-left">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">E-Mail</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3 text-center">Verifiziert</th>
              <th className="px-4 py-3 text-center">Bestellungen</th>
              <th className="px-4 py-3">Registriert am</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-zinc-600">{c.email}</td>
                <td className="px-4 py-3 text-zinc-500">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {c.emailVerified
                    ? <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">Ja</span>
                    : <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Nein</span>}
                </td>
                <td className="px-4 py-3 text-center font-medium">{c._count.preOrders}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(c.createdAt).toLocaleDateString('de-DE')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Keine Kunden gefunden</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
