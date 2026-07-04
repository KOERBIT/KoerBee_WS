'use client'

import { useEffect, useState } from 'react'

export default function AnthropicSettingsForm() {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('claude-haiku-4-5')
  const [hasKey, setHasKey] = useState(false)
  const [source, setSource] = useState<'db' | 'env' | 'none'>('none')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/account/anthropic-credentials').then(r => r.json()).then(d => {
      setModel(d.model ?? 'claude-haiku-4-5')
      setHasKey(!!d.hasKey)
      setSource(d.source ?? 'none')
    }).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/account/anthropic-credentials', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMsg({ kind: 'err', text: data.error === 'api_key_required' ? 'API-Key fehlt.' : 'Speichern fehlgeschlagen.' })
      return
    }
    setApiKey(''); setHasKey(true); setSource('db')
    setMsg({ kind: 'ok', text: 'Gespeichert.' })
  }

  async function test() {
    setTesting(true); setMsg(null)
    const body = apiKey ? { apiKey } : {}
    const res = await fetch('/api/account/anthropic-credentials/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setTesting(false)
    if (data.ok) setMsg({ kind: 'ok', text: '✓ Key gültig – Verbindung zu Claude erfolgreich.' })
    else if (data.error === 'not_configured') setMsg({ kind: 'err', text: 'Noch kein API-Key hinterlegt.' })
    else setMsg({ kind: 'err', text: '✗ Key ungültig oder kein Guthaben.' })
  }

  if (loading) return <p className="text-[13px] text-zinc-400">Lädt…</p>

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-zinc-500">Für das automatische Auslesen von Belegen (Ausgaben) per Foto/PDF. Key aus <span className="font-medium">console.anthropic.com</span> → API Keys. Wird verschlüsselt gespeichert.</p>
      {source === 'env' && (
        <p className="text-[12px] text-zinc-500">Aktuell aktive Quelle: Server-Umgebungsvariable. Hier hinterlegte Werte haben Vorrang.</p>
      )}
      <div>
        <label className="block text-[12px] font-medium text-zinc-500 mb-1">API-Key</label>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          placeholder={hasKey ? '•••••••• (gespeichert – leer lassen, um es zu behalten)' : 'sk-ant-...'}
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-zinc-500 mb-1">Modell</label>
        <select value={model} onChange={e => setModel(e.target.value)}
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value="claude-haiku-4-5">Haiku 4.5 – günstig (~0,2 Cent/Beleg, empfohlen)</option>
          <option value="claude-sonnet-4-6">Sonnet 4.6 – genauer (~0,7 Cent/Beleg)</option>
        </select>
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
    </div>
  )
}
