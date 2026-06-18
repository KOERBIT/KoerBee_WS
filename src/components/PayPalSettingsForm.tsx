'use client'

import { useEffect, useState } from 'react'

const SANDBOX = 'https://api-m.sandbox.paypal.com'
const LIVE = 'https://api-m.paypal.com'

export default function PayPalSettingsForm() {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [apiBase, setApiBase] = useState(SANDBOX)
  const [hasSecret, setHasSecret] = useState(false)
  const [source, setSource] = useState<'db' | 'env' | 'none'>('none')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch('/api/account/paypal-credentials')
      .then(r => r.json())
      .then(d => {
        setClientId(d.clientId ?? '')
        setApiBase(d.apiBase ?? SANDBOX)
        setHasSecret(!!d.hasSecret)
        setSource(d.source ?? 'none')
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/account/paypal-credentials', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret, apiBase }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      const m: Record<string, string> = {
        client_id_required: 'Client ID fehlt.',
        client_secret_required: 'Client Secret fehlt.',
        invalid_api_base: 'Ungültige API-Umgebung.',
      }
      setMsg({ kind: 'err', text: m[data.error] ?? 'Speichern fehlgeschlagen.' })
      return
    }
    setClientSecret('')
    setHasSecret(true)
    setSource('db')
    setMsg({ kind: 'ok', text: 'Gespeichert.' })
  }

  async function test() {
    setTesting(true); setMsg(null)
    // Wenn ein Secret eingegeben wurde, dieses (ungespeichert) testen, sonst die gespeicherten.
    const body = clientId && clientSecret ? { clientId, clientSecret, apiBase } : {}
    const res = await fetch('/api/account/paypal-credentials/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setTesting(false)
    if (data.ok) setMsg({ kind: 'ok', text: '✓ Verbindung erfolgreich – Credentials sind gültig.' })
    else if (data.error === 'not_configured') setMsg({ kind: 'err', text: 'Noch keine Credentials hinterlegt.' })
    else setMsg({ kind: 'err', text: '✗ Verbindung fehlgeschlagen – Client ID/Secret oder Umgebung prüfen.' })
  }

  if (loading) return <p className="text-[13px] text-zinc-400">Lädt…</p>

  return (
    <div className="space-y-4">
      {source === 'env' && (
        <p className="text-[12px] text-zinc-500">Aktuell aktive Quelle: Server-Umgebungsvariablen. Hier hinterlegte Werte haben Vorrang.</p>
      )}
      <div>
        <label className="block text-[12px] font-medium text-zinc-500 mb-1">Umgebung</label>
        <select value={apiBase} onChange={e => setApiBase(e.target.value)}
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value={SANDBOX}>Sandbox (Test)</option>
          <option value={LIVE}>Live (Echtbetrieb)</option>
        </select>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-zinc-500 mb-1">Client ID</label>
        <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="PayPal Client ID"
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-zinc-500 mb-1">Client Secret</label>
        <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)}
          placeholder={hasSecret ? '•••••••• (gespeichert – leer lassen, um es zu behalten)' : 'PayPal Client Secret'}
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>

      {msg && <p className={`text-[12px] font-medium ${msg.kind === 'ok' ? 'text-green-600' : 'text-rose-600'}`}>{msg.text}</p>}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-[13px] font-semibold transition-colors">
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
        <button onClick={test} disabled={testing}
          className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 text-zinc-700 rounded-lg text-[13px] font-medium transition-colors">
          {testing ? 'Teste…' : 'Verbindung testen'}
        </button>
      </div>
      <p className="text-[11px] text-zinc-400">Das Secret wird verschlüsselt gespeichert und nie wieder angezeigt. Die „Transaction Search" muss in der PayPal-App aktiviert sein.</p>
    </div>
  )
}
