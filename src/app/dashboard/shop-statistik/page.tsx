'use client'

import { useState, useEffect } from 'react'

interface Analytics {
  total: number
  dailyViews: Array<{ date: string; count: number }>
  topPages: Array<{ name: string; count: number }>
  topCountries: Array<{ name: string; count: number }>
  topReferrers: Array<{ name: string; count: number }>
}

const PAGE_LABELS: Record<string, string> = {
  '/': 'Startseite',
  '/shop': 'Shop',
  '/shop/produkte': 'Produkte',
  '/shop/warenkorb': 'Warenkorb',
  '/shop/konto': 'Konto',
  '/shop/login': 'Login',
  '/shop/registrieren': 'Registrierung',
}

export default function ShopStatistikPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetch(`/api/admin/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }, [days])

  if (!data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-800 mb-6">Shop-Statistik</h1>
        <p className="text-zinc-400">Lade...</p>
      </div>
    )
  }

  const maxDaily = Math.max(...data.dailyViews.map(d => d.count), 1)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Shop-Statistik</h1>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="border border-zinc-200 rounded-xl px-3 py-2 text-sm"
        >
          <option value={7}>Letzte 7 Tage</option>
          <option value={30}>Letzte 30 Tage</option>
          <option value={90}>Letzte 90 Tage</option>
          <option value={365}>Letztes Jahr</option>
        </select>
      </div>

      {/* Overview card */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-sm text-zinc-500">Seitenaufrufe</p>
          <p className="text-2xl font-bold text-zinc-800">{data.total.toLocaleString('de-DE')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-sm text-zinc-500">Pro Tag (Schnitt)</p>
          <p className="text-2xl font-bold text-amber-600">
            {data.dailyViews.length > 0 ? Math.round(data.total / data.dailyViews.length).toLocaleString('de-DE') : 0}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-sm text-zinc-500">Verschiedene Seiten</p>
          <p className="text-2xl font-bold text-blue-600">{data.topPages.length}</p>
        </div>
      </div>

      {/* Daily chart (simple bar chart) */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-6">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">Tägliche Aufrufe</h2>
        <div className="flex items-end gap-[2px] h-32">
          {data.dailyViews.map(d => (
            <div
              key={d.date}
              className="flex-1 rounded-t transition-all group relative"
              style={{
                height: `${Math.max((d.count / maxDaily) * 100, 2)}%`,
                background: d.count > 0 ? '#f59e0b' : '#f4f4f5',
                minWidth: 2,
              }}
              title={`${d.date}: ${d.count} Aufrufe`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                {new Date(d.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}: {d.count}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
          {data.dailyViews.length > 0 && (
            <>
              <span>{new Date(data.dailyViews[0].date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(data.dailyViews[data.dailyViews.length - 1].date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span>
            </>
          )}
        </div>
      </div>

      {/* Top pages, countries, referrers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pages */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Top Seiten</h2>
          <div className="space-y-2">
            {data.topPages.map(p => (
              <div key={p.name} className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 truncate mr-2">{PAGE_LABELS[p.name] ?? p.name}</span>
                <span className="text-sm font-medium text-zinc-800 shrink-0">{p.count}</span>
              </div>
            ))}
            {data.topPages.length === 0 && <p className="text-sm text-zinc-400">Noch keine Daten</p>}
          </div>
        </div>

        {/* Countries */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Länder</h2>
          <div className="space-y-2">
            {data.topCountries.map(c => (
              <div key={c.name} className="flex items-center justify-between">
                <span className="text-sm text-zinc-600">{c.name}</span>
                <span className="text-sm font-medium text-zinc-800">{c.count}</span>
              </div>
            ))}
            {data.topCountries.length === 0 && <p className="text-sm text-zinc-400">Noch keine Daten</p>}
          </div>
        </div>

        {/* Referrers */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Verweise (Referrer)</h2>
          <div className="space-y-2">
            {data.topReferrers.map(r => (
              <div key={r.name} className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 truncate mr-2">{r.name}</span>
                <span className="text-sm font-medium text-zinc-800 shrink-0">{r.count}</span>
              </div>
            ))}
            {data.topReferrers.length === 0 && <p className="text-sm text-zinc-400">Noch keine Daten</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
