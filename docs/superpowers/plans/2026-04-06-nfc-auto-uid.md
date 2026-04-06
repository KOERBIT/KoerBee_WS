# NFC Auto-UID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NFC-Tags einmalig mit einer App-URL beschreiben (Android: automatisch via NDEFWriter; iOS: via NFC Tools mit 2 Taps), danach iPhone/Chrome einfach hinhalten → Aktionsauswahl erscheint sofort ohne jede Interaktion.

**Architecture:** Zwei unabhängige Änderungen: (1) `scan/page.tsx` liest `?uid=` via `useSearchParams` und startet automatisch den Lookup; (2) `NfcTagManager.tsx` erhält nach dem Speichern einen "Tag beschreiben"-Schritt mit NDEFWriter (Android) oder Copy+NFC-Tools-Link (iOS).

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Web NFC API (`NDEFReader`/`NDEFWriter`), Clipboard API, `useSearchParams` aus `next/navigation`

---

## Betroffene Dateien

| Datei | Was ändert sich |
|---|---|
| `src/app/dashboard/nfc/scan/page.tsx` | Suspense-Wrapper + `useSearchParams` + `useEffect` für Auto-Lookup |
| `src/app/dashboard/nfc/NfcTagManager.tsx` | `step`-State + "Tag beschreiben"-UI + NDEFWriter + Copy/NFC-Tools-Link |

---

## Task 1: scan/page.tsx — Auto-Lookup via URL-Parameter

**Files:**
- Modify: `src/app/dashboard/nfc/scan/page.tsx`

Das Ziel: `https://app.com/dashboard/nfc/scan?uid=04A1B2C3` öffnet die Seite und ruft sofort `lookupTag('04A1B2C3')` auf — ohne dass der Nutzer irgendetwas tut.

In Next.js 15 erfordert `useSearchParams()` in einer Client-Komponente einen `<Suspense>`-Wrapper im Default-Export. Die aktuelle Komponente heißt `NfcScanPage` und wird zum Default-Export — wir benennen sie intern um und wrappen sie.

- [ ] **Schritt 1: Imports aktualisieren**

Zeile 3 in `scan/page.tsx` — ersetze:
```typescript
import { useState, useCallback } from 'react'
import Link from 'next/link'
```
durch:
```typescript
import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
```

- [ ] **Schritt 2: Komponente umbenennen und useSearchParams + useEffect hinzufügen**

Zeile mit `export default function NfcScanPage()` — entferne `export default` (nur noch `function NfcScanPage()`).

Direkt nach der Zeile `const [nfcAvailable] = useState(...)` (also nach dem letzten State vor `lookupTag`) füge ein:

```typescript
const searchParams = useSearchParams()
const uidParam = searchParams.get('uid')

useEffect(() => {
  if (uidParam && state === 'idle') {
    setState('reading')
    lookupTag(uidParam)
  }
}, [uidParam]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Schritt 3: Neuen Default-Export mit Suspense-Wrapper am Ende der Datei hinzufügen**

Ganz am Ende der Datei (nach der schließenden `}` von `NfcScanPage`) anfügen:

```typescript
export default function NfcScanPageWrapper() {
  return (
    <Suspense fallback={
      <div className="px-4 py-8 max-w-md mx-auto flex flex-col items-center py-12">
        <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    }>
      <NfcScanPage />
    </Suspense>
  )
}
```

- [ ] **Schritt 4: TypeScript-Check**

```bash
npx tsc --noEmit
```
Erwartetes Ergebnis: keine Fehler.

- [ ] **Schritt 5: Commit**

```bash
git add src/app/dashboard/nfc/scan/page.tsx
git commit -m "feat: NFC scan — auto-lookup via ?uid= URL-Parameter (iOS/Chrome kompatibel)"
```

---

## Task 2: NfcTagManager.tsx — "Tag beschreiben"-Schritt nach Registrierung

**Files:**
- Modify: `src/app/dashboard/nfc/NfcTagManager.tsx`

Nach dem Speichern eines Tags wechselt das Modal in einen zweiten Schritt mit drei Varianten:
- **Android (NDEFWriter):** Button "Tag halten" → schreibt URL automatisch
- **iOS/andere:** "URL kopieren" + "NFC Tools öffnen" + Anleitung
- **Erfolg/Fehler:** entsprechende Rückmeldung

- [ ] **Schritt 1: Neue States und Typen hinzufügen**

In `NfcTagManager.tsx` — füge direkt nach `const [nfcSupported]` (Zeile 29) ein:

```typescript
const [step, setStep] = useState<'form' | 'write' | 'writing' | 'done'>('form')
const [tagUrl, setTagUrl] = useState('')
const [writeError, setWriteError] = useState('')
const [urlCopied, setUrlCopied] = useState(false)
```

- [ ] **Schritt 2: handleSubmit anpassen**

Ersetze die gesamte `handleSubmit`-Funktion (Zeilen ~61-81):

```typescript
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
```

- [ ] **Schritt 3: Hilfsfunktionen hinzufügen**

Füge nach `handleSubmit` ein:

```typescript
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
```

- [ ] **Schritt 4: Modal-Schließen-Button anpassen**

Im JSX — der X-Button oben rechts ruft aktuell `setOpen(false)` auf. Ersetze durch `closeAndReset()`:

```tsx
<button onClick={closeAndReset} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
```

- [ ] **Schritt 5: "Tag beschreiben"-Schritt ins Modal einbauen**

Im Modal-JSX — aktuell zeigt das Modal direkt das `<form>`. Ersetze die gesamte Form-Anzeige durch eine bedingte Darstellung. Das `<form>` bleibt unverändert, es wird nur hinter einer Bedingung versteckt:

Ersetze:
```tsx
<form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
```
durch:
```tsx
{/* Schritt-Indikator */}
<div className="flex items-center gap-2 px-6 pb-4">
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
```

Und füge nach dem schließenden `</form>`-Tag die "Tag beschreiben"-Schritte ein:

```tsx
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

    {/* Write-Bereit (Android oder iOS) */}
    {step === 'write' && (
      <>
        {writeError && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            <p className="text-[13px] text-rose-600">{writeError}</p>
          </div>
        )}

        {/* Generierte URL anzeigen */}
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

        {/* iOS / andere: Copy + NFC Tools */}
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
```

- [ ] **Schritt 6: TypeScript-Check**

```bash
npx tsc --noEmit
```
Erwartetes Ergebnis: keine Fehler.

- [ ] **Schritt 7: Commit**

```bash
git add src/app/dashboard/nfc/NfcTagManager.tsx
git commit -m "feat: NFC-Registrierung — Tag beschreiben Schritt mit NDEFWriter (Android) und NFC Tools Link (iOS)"
```

---

## Manuelle Verifikation

1. **Auto-Lookup:** URL `http://localhost:3000/dashboard/nfc/scan?uid=<bekannte-UID>` im Browser öffnen → Seite lädt → Tag wird sofort nachgeschlagen → Aktionsauswahl erscheint
2. **Unbekannte UID:** `?uid=unbekannt` → "Tag nicht registriert"-Ansicht
3. **Kein uid-Parameter:** `/dashboard/nfc/scan` → normaler Idle-Screen (kein Regressionsbruch)
4. **Android Registrierung:** Tag registrieren → "Tag halten"-Button erscheint → Tag halten → Erfolg → Modal schließt
5. **iOS/Chrome-Desktop Registrierung:** Tag registrieren → Copy+NFC-Tools-UI erscheint → "URL kopieren" zeigt ✓ Kopiert → "Fertig" schließt Modal
