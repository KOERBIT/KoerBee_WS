# NFC Auto-UID Design Spec

## Goal

iPhone-Nutzer halten ihr Gerät an einen NFC-Tag → Safari öffnet automatisch die Scan-Seite → Tag wird nachgeschlagen → Aktionsauswahl erscheint. Keine manuelle Eingabe, kein Knopf drücken.

Einmalige Einrichtung pro Tag: URL wird automatisch auf den Tag geschrieben (Android: vollautomatisch via NDEFWriter; iOS: halbautomatisch via NFC Tools, 2 Taps).

---

## Hintergrund

Die Web NFC API (`NDEFReader`) ist nur auf Android Chrome verfügbar. Auf iOS gibt es keinen Browser-Zugriff auf NFC. iOS liest jedoch NDEF-URL-Records auf NFC-Tags automatisch mit dem System-NFC-Reader und öffnet Safari mit der entsprechenden URL.

Lösung: Tags werden einmalig mit der URL `https://<host>/dashboard/nfc/scan?uid=<UID>` beschrieben. Danach funktioniert das Scannen auf iPhone vollautomatisch über iOS.

---

## Teil 1: Scan-Seite — Auto-Lookup via URL-Parameter

### Datei
`src/app/dashboard/nfc/scan/page.tsx`

### Verhalten

Beim Laden der Seite prüft die Komponente via `useSearchParams()` ob ein `uid`-Parameter in der URL vorhanden ist.

- **`uid` vorhanden:** `lookupTag(uid)` wird sofort in einem `useEffect` aufgerufen. Der State springt direkt zu `'reading'` → `'found'` (oder `'notfound'`). Die Idle-Ansicht wird nie angezeigt.
- **Kein `uid`:** Normaler Flow — Idle-Ansicht mit Scan-Button.

### Flow auf iPhone

```
Tag halten → iOS liest NDEF-URL → Safari öffnet:
https://app.vercel.app/dashboard/nfc/scan?uid=04A1B2C3
→ useEffect feuert → lookupTag('04A1B2C3')
→ state = 'reading' → state = 'found' → Aktionsauswahl
```

### Wichtige Details

- `useSearchParams()` erfordert dass die Komponente in einem `<Suspense>`-Wrapper liegt (Next.js App Router Requirement). Die `page.tsx` wrапpt die Client-Komponente entsprechend.
- Der `useEffect` darf `lookupTag` nur einmal aufrufen — Dependency Array: `[uidParam]` mit Guard (`if (uidParam && state === 'idle')`).
- Die bestehende manuelle Eingabe und der Android-NDEFReader-Flow bleiben unverändert.

---

## Teil 2: Registrierung — "Tag beschreiben" Schritt

### Datei
`src/app/dashboard/nfc/NfcTagManager.tsx`

### Verhalten

Nach erfolgreichem Speichern eines Tags (API-Response mit `tag.uid`) wechselt das Modal in einen zweiten Schritt: **"Tag beschreiben"**.

Die generierte URL lautet:
```
https://<window.location.origin>/dashboard/nfc/scan?uid=<tag.uid>
```

### Android-Pfad (NDEFWriter verfügbar: `'NDEFReader' in window`)

Button **"Tag jetzt halten"**:
```typescript
const ndef = new (window as any).NDEFReader()
await ndef.write({
  records: [{ recordType: 'url', data: tagUrl }]
})
```
- Während des Schreibens: Spinner + "Tag halten…"
- Erfolg: grüne Bestätigung + "Fertig"-Button schließt Modal
- Fehler: Fehlermeldung + Retry-Button

### iOS-Pfad (kein NDEFWriter: `'NDEFReader' not in window`)

Die generierte URL wird prominent als kopierbarer Text angezeigt. Ein Button **"URL kopieren"** legt sie in die Zwischenablage. Ein zweiter Button **"NFC Tools öffnen"** öffnet die App via `nfctools://` URL-Scheme (öffnet NFC Tools, füllt aber kein Feld vor — iOS-Einschränkung).

Ablauf für den Nutzer (einmalig pro Tag, ~30 Sekunden):
1. "URL kopieren" tippen → URL ist in der Zwischenablage
2. "NFC Tools öffnen" tippen → iOS-Prompt bestätigen → NFC Tools öffnet sich
3. In NFC Tools: Schreiben → URL → Einfügen → Tag halten → geschrieben
4. Zurück zur App: "Fertig" tippen → Modal schließt

### State-Maschine im Modal

```
'form'     → Eingabeformular (bestehend)
'saving'   → API-Call läuft
'write'    → "Tag beschreiben"-Schritt
'writing'  → NDEFWriter aktiv (nur Android)
'done'     → Erfolg
```

### UI-Details

- Schritt-Indikator oben im Modal: "① Registrieren  ② Tag beschreiben"
- Im `'write'`-Schritt: Die generierte URL wird angezeigt (klein, als Code)
- "Überspringen"-Link für Nutzer die den Tag später beschreiben wollen

---

## Nicht in Scope

- Schreiben von Tags auf iOS ohne NFC Tools (technisch nicht möglich im Browser)
- Automatisches Öffnen von NFC Tools ohne Nutzer-Bestätigung (iOS-Einschränkung)
- Löschen/Überschreiben von bereits beschriebenen Tags (separates Feature)
- Offline-Unterstützung

---

## Manuelle Verifikation

1. **Android:** Tag registrieren → "Tag halten" → URL auf Tag geschrieben → Tag mit Scan-Seite öffnen → Aktionsauswahl erscheint sofort
2. **iPhone:** Tag mit NFC-Tools beschreiben → iPhone an Tag halten → Safari öffnet Scan-Seite → Aktionsauswahl erscheint sofort ohne Interaktion
3. **Fehlerfall:** Unbekannte UID in URL → "Tag nicht registriert" + Link zu Registrierung
4. **Kein uid-Parameter:** Normaler Scan-Flow (kein Regressionsbruch)
