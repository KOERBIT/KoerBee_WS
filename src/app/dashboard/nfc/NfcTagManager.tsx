'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ACTION_TYPES = [
  { value: 'inspection',    label: 'Durchschau' },
  { value: 'varroa',        label: 'Varroa Behandlung' },
  { value: 'feeding',       label: 'Füttern' },
  { value: 'honey_harvest', label: 'Honigernte' },
]

const NEEDS_AMOUNT = ['feeding']
const UNITS: Record<string, string[]> = {
  feeding: ['kg', 'l'],
}

interface Colony { id: string; name: string; apiary: { name: string } }
interface ActionForm { type: string; amount: string; unit: string }

export function NfcTagManager({ colonies }: { colonies: Colony[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uid, setUid] = useState('')
  const [label, setLabel] = useState('')
  const [colonyId, setColonyId] = useState(colonies[0]?.id ?? '')
  const [actions, setActions] = useState<ActionForm[]>([{ type: 'inspection', amount: '', unit: 'kg' }])
  const [scanning, setScanning] = useState(false)
  const [nfcSupported] = useState(() => typeof window !== 'undefined' && 'NDEFReader' in window)
  const [step, setStep] = useState<'form' | 'write' | 'writing' | 'done'>('form')
  const [tagUrl, setTagUrl] = useState('')
  const [writeError, setWriteError] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)
  const router = useRouter()

  async function scanUid() {
    setScanning(true)
    try {
      const ndef = new (window as any).NDEFReader()
      await ndef.scan()
      ndef.addEventListener('reading', ({ serialNumber }: { serialNumber: string }) => {
        setUid(serialNumber)
        setScanning(false)
      }, { once: true })
    } catch {
      setScanning(false)
    }
  }

  function addAction() {
    setActions(a => [...a, { type: 'feeding', amount: '', unit: 'kg' }])
  }
  function removeAction(i: number) {
    setActions(a => a.filter((_, idx) => idx !== i))
  }
  function updateAction(i: number, key: keyof ActionForm, value: string) {
    setActions(a => a.map((act, idx) => {
      if (idx !== i) return act
      const updated = { ...act, [key]: value }
      if (key === 'type') updated.unit = UNITS[value]?.[0] ?? 'kg'
      return updated
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/nfc/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid, label: label || null, colonyId,
        actions: actions.map(a => ({
          type: a.type,
          defaultValues: NEEDS_AMOUNT.includes(a.type) && a.amount
            ? { amount: parseFloat(a.amount), unit: a.unit }
            : null,
        })),
      }),
    })
    setLoading(false)
    if (res.ok) {
      const url = `${window.location.origin}/dashboard/nfc/scan?uid=${encodeURIComponent(uid)}`
      setTagUrl(url)
      setStep('write')
      router.refresh()
    }
  }

  async function writeToTag() {
    setStep('writing')
    setWriteError('')
    try {
      const ndef = new (window as any).NDEFReader()
      await ndef.write({ records: [{ recordType: 'url', data: tagUrl }] })
      setStep('done')
    } catch {
      setWriteError('Schreiben fehlgeschlagen — bitte nochmal versuchen.')
      setStep('write')
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(tagUrl)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  function closeAndReset() {
    setOpen(false)
    setStep('form')
    setUid(''); setLabel(''); setActions([{ type: 'inspection', amount: '', unit: 'kg' }])
    setTagUrl(''); setWriteError(''); setUrlCopied(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-medium transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tag registrieren
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">NFC-Tag registrieren</h2>
              <button onClick={closeAndReset} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Schritt-Indikator */}
            <div className="flex items-center gap-2 px-6 pb-4 pt-4">
              <div className={`flex items-center gap-1.5 text-[12px] font-medium ${step === 'form' ? 'text-amber-600' : 'text-zinc-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'form' ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>1</div>
                Registrieren
              </div>
              <div className="flex-1 h-px bg-zinc-100" />
              <div className={`flex items-center gap-1.5 text-[12px] font-medium ${step !== 'form' ? 'text-amber-600' : 'text-zinc-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step !== 'form' ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>2</div>
                Tag beschreiben
              </div>
            </div>

            <form onSubmit={handleSubmit} className={`px-6 py-5 space-y-4 ${step !== 'form' ? 'hidden' : ''}`}>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Tag-UID *</label>
                <div className="flex gap-2">
                  <input
                    value={uid}
                    onChange={e => setUid(e.target.value)}
                    required
                    placeholder="z.B. 04:A1:B2:C3:D4:E5"
                    className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                  {nfcSupported && (
                    <button
                      type="button"
                      onClick={scanUid}
                      disabled={scanning}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-700 rounded-xl text-[13px] font-medium transition-colors shrink-0"
                    >
                      {scanning ? (
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6"/>
                          <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        </svg>
                      )}
                      Scan
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">UID vom Tag-Aufkleber oder via Scan-Button auslesen</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Bezeichnung</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="z.B. Stock A, Vordertür"
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Volk *</label>
                <select value={colonyId} onChange={e => setColonyId(e.target.value)} required
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                  {colonies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.apiary.name})</option>)}
                </select>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-medium text-zinc-700">Aktionen beim Scan</label>
                  <button type="button" onClick={addAction} className="text-[12px] text-amber-600 font-medium hover:text-amber-700">+ Aktion</button>
                </div>
                <div className="space-y-2">
                  {actions.map((action, i) => (
                    <div key={i} className="bg-zinc-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select value={action.type} onChange={e => updateAction(i, 'type', e.target.value)}
                          className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                          {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {actions.length > 1 && (
                          <button type="button" onClick={() => removeAction(i)} className="text-zinc-300 hover:text-rose-500 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>
                      {NEEDS_AMOUNT.includes(action.type) && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input type="number" step="0.1" min="0" value={action.amount}
                              onChange={e => updateAction(i, 'amount', e.target.value)}
                              placeholder="Standardmenge (optional)"
                              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          </div>
                          <select value={action.unit} onChange={e => updateAction(i, 'unit', e.target.value)}
                            className="border border-zinc-200 rounded-lg px-2 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                            {(UNITS[action.type] ?? ['kg', 'l']).map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading || !uid || !colonyId}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {loading ? 'Wird gespeichert…' : 'Tag registrieren'}
              </button>
            </form>

            {/* Schritt 2: Tag beschreiben */}
            {(step === 'write' || step === 'writing' || step === 'done') && (
              <div className="px-6 py-5 space-y-5">

                {/* Erfolg */}
                {step === 'done' && (
                  <div className="flex flex-col items-center py-4 space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p className="text-[15px] font-semibold text-zinc-900">Tag erfolgreich beschrieben</p>
                    <p className="text-[13px] text-zinc-400 text-center">iPhone und Chrome: einfach Tag halten — Aktion öffnet automatisch</p>
                    <button type="button" onClick={closeAndReset}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                      Fertig
                    </button>
                  </div>
                )}

                {/* Schreiben läuft */}
                {step === 'writing' && (
                  <div className="flex flex-col items-center py-6 space-y-3">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
                    <p className="text-[14px] font-medium text-zinc-700">Tag halten…</p>
                  </div>
                )}

                {/* Write-Bereit */}
                {step === 'write' && (
                  <>
                    {writeError && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                        <p className="text-[13px] text-rose-600">{writeError}</p>
                      </div>
                    )}

                    {/* Generierte URL */}
                    <div>
                      <p className="text-[12px] font-medium text-zinc-500 mb-1.5">Tag-URL</p>
                      <code className="block text-[11px] bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 text-zinc-600 break-all">{tagUrl}</code>
                    </div>

                    {/* Android: NDEFWriter */}
                    {nfcSupported && (
                      <div className="space-y-3">
                        <p className="text-[13px] text-zinc-600">Halte den Tag jetzt an die Rückseite deines Geräts:</p>
                        <button type="button" onClick={writeToTag}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 text-[14px] font-semibold transition-colors">
                          Tag jetzt halten &amp; beschreiben
                        </button>
                      </div>
                    )}

                    {/* iOS / andere */}
                    {!nfcSupported && (
                      <div className="space-y-3">
                        <p className="text-[13px] text-zinc-600">
                          Schreibe diese URL mit <strong>NFC Tools</strong> auf den Tag:
                        </p>
                        <ol className="text-[12px] text-zinc-500 space-y-1 list-decimal list-inside">
                          <li>„URL kopieren" tippen</li>
                          <li>„NFC Tools öffnen" tippen &amp; bestätigen</li>
                          <li>In NFC Tools: Schreiben → URL → Einfügen → Tag halten</li>
                        </ol>
                        <div className="flex gap-2">
                          <button type="button" onClick={copyUrl}
                            className={`flex-1 border rounded-xl py-2.5 text-[13px] font-medium transition-colors ${urlCopied ? 'border-green-300 bg-green-50 text-green-700' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700'}`}>
                            {urlCopied ? '✓ Kopiert' : 'URL kopieren'}
                          </button>
                          <a href="nfctools://" className="flex-1 bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl py-2.5 text-[13px] font-medium transition-colors text-center">
                            NFC Tools öffnen
                          </a>
                        </div>
                        <button type="button" onClick={closeAndReset}
                          className="w-full border border-zinc-200 rounded-xl py-2.5 text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">
                          Fertig (Tag später beschreiben)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
