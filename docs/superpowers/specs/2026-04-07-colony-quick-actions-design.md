# Colony Quick Actions — Design Spec

**Date:** 2026-04-07  
**Status:** Approved

## Overview

Add a quick-action card to the colony detail page (`/dashboard/colonies/[id]`) that lets users manually book common hive activities without needing an NFC scan. The card shows four action buttons; clicking one expands an inline form directly below the buttons.

## Actions

| Action | Type | Form Fields | API |
|---|---|---|---|
| Durchsicht | inspection | Varroa-Befall, Volksstärke, Königin gesehen, Temperament, Brutnest, Schwarmstimmung | `POST /api/inspections` |
| Füttern | feeding | Menge (kg, Stepper 0.5-Schritte), Futtertyp (Zuckerwasser / Futterteig) | `POST /api/treatments` |
| Varroa | varroa | Kein Formular — Datum wird automatisch auf heute gesetzt | `POST /api/treatments` |
| Honigernte | honey_harvest | Anzahl Zargen (Stepper, min 1) | `POST /api/treatments` |

## Layout & Interaction

- **Position:** Zwischen Info-Cards (Königin / Inspektionen / Behandlungen / NFC) und der Chronik
- **Karte:** Weißer rounded Container mit Label "Schnellaktionen"
- **Button-Grid:** 2×2 — Icon + Label nebeneinander, farbkodiert pro Aktion (grün / blau / rot / gelb)
- **Inline-Formular:** Erscheint unterhalb der Buttons bei aktivem Button (border-top Trenner). Klick auf aktiven Button schließt das Formular wieder.
- **Nur ein Formular gleichzeitig** — Klick auf anderen Button wechselt direkt.
- **Nach Buchung:** `router.refresh()` damit die Server-Komponente neu rendert und die Chronik aktualisiert wird. Formular schließt sich.

## Komponente

**Datei:** `src/app/dashboard/colonies/[id]/ColonyQuickActions.tsx`  
**Typ:** `'use client'`  
**Props:** `{ colonyId: string }`

**State:**
- `activeAction: 'inspection' | 'feeding' | 'varroa' | 'honey_harvest' | null`
- `inspectionForm` — gleiche Felder wie NFC-Scan-Seite
- `feedingForm: { amount: number; foodType: string }`
- `honigernteForm: { zargen: number }`
- `loading: boolean`

**Formular-Logik:**  
Die Formulare sind direkt in `ColonyQuickActions.tsx` implementiert (nicht als separate Dateien). Die Logik ist identisch zur NFC-Scan-Seite (`/dashboard/nfc/scan/page.tsx`).

## API-Requests

**Durchsicht:**
```
POST /api/inspections
{ colonyId, items: [{ key, value }, ...] }
```

**Füttern:**
```
POST /api/treatments
{ colonyId, type: 'feeding', amount, unit: 'kg', notes: foodType }
```

**Varroa:**
```
POST /api/treatments
{ colonyId, type: 'varroa' }
```

**Honigernte:**
```
POST /api/treatments
{ colonyId, type: 'honey_harvest', amount: zargen, unit: 'Zargen' }
```

## Einbindung in page.tsx

In `src/app/dashboard/colonies/[id]/page.tsx` wird `<ColonyQuickActions colonyId={colony.id} />` zwischen dem Info-Cards-Grid und der Chronik-Sektion eingefügt.

## Out of Scope

- Kein neuer API-Endpunkt — bestehende `/api/inspections` und `/api/treatments` werden direkt verwendet
- Keine Extraktion der Formular-Komponenten als shared components
- Kein Offline-Support
