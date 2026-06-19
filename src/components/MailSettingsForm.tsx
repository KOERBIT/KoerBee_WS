'use client'

import { useEffect, useState } from 'react'

export default function MailSettingsForm() {
  const [imapHost, setImapHost] = useState('imap.gmx.net')
  const [imapPort, setImapPort] = useState(993)
  const [imapUser, setImapUser] = useState('')
  const [imapPassword, setImapPassword] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/account/mail-credentials').then(r => r.json()).then(d => {
      setImapHost(d.imapHost ?? 'imap.gmx.net')
      setImapPort(d.imapPort ?? 993)
      setImapUser(d.imapUser ?? '')
      setHasPassword(!!d.hasPassword)
    }).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/account/mail-credentials', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imapHost, imapPort, imapUser, imapPassword }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      const m: Record<string, string> = { user_required: 'E-Mail-Adresse fehlt.', password_required: 'Passwort fehlt.' }
      setMsg({ kind: 'err', text: m[data.error] ?? 'Speichern fehlgeschlagen.' })
      return
    }
    setImapPassword(''); setHasPassword(true)
    setMsg({ kind: 'ok', text: 'Gespeichert.' })
  }

  async function test() {
    setTesting(true); setMsg(null)
    const body = imapUser && imapPassword ? { imapHost, imapPort, imapUser, imapPassword } : {}
    const res = await fetch('/api/account/mail-credentials/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setTesting(false)
    if (data.ok) setMsg({ kind: 'ok', text: '✓ Postfach erreichbar – Login erfolgreich.' })
    else if (data.error === 'not_configured') setMsg({ kind: 'err', text: 'Noch keine Zugangsdaten hinterlegt.' })
    else setMsg({ kind: 'err', text: '✗ Login fehlgeschlagen – E-Mail/Passwort (App-Passwort) und Server prüfen.' })
  }

  if (loading) return <p className="text-[13px] text-zinc-400">Lädt…</p>

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-zinc-500">Für das automatische Auslesen von PayPal-Zahlungsmails. Nutze am besten ein <strong>App-Passwort</strong> deines Mail-Anbieters (nicht dein normales Login-Passwort).</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-zinc-500 mb-1">IMAP-Server</label>
          <input value={imapHost} onChange={e => setImapHost(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-zinc-500 mb-1">Port</label>
          <input type="number" value={imapPort} onChange={e => setImapPort(parseInt(e.target.value) || 993)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-zinc-500 mb-1">E-Mail-Adresse</label>
        <input value={imapUser} onChange={e => setImapUser(e.target.value)} placeholder="z.B. name@gmx.de"
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-zinc-500 mb-1">Passwort / App-Passwort</label>
        <input type="password" value={imapPassword} onChange={e => setImapPassword(e.target.value)}
          placeholder={hasPassword ? '•••••••• (gespeichert – leer lassen, um es zu behalten)' : 'App-Passwort'}
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
          {testing ? 'Teste…' : 'Postfach testen'}
        </button>
      </div>
      <p className="text-[11px] text-zinc-400">Das Passwort wird verschlüsselt gespeichert. Es werden nur PayPal-Mails gelesen, nichts gespeichert außer den erkannten Zahlungen.</p>
    </div>
  )
}
