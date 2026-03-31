# Bienenverwaltungs-Plattform — Design Spec
**Datum:** 2026-03-31
**Status:** Approved

---

## Ziel

Aufbau einer eigenen Bienenhaltungs-Plattform inspiriert von beeintouch.de. MVP-Fokus auf Kernverwaltung (Völker, Standorte, Stockkarten) und Mobile-First PWA mit RFID/NFC-Integration.

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Datenbank | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | NextAuth.js (Email/Passwort) |
| PWA | next-pwa + Service Worker |
| Offline-Storage | IndexedDB (für Sync) |
| NFC/RFID | Web NFC API (Chrome/Android) |
| Karte | Leaflet.js |
| Deployment | Vercel (Frontend + API) + Supabase (DB) |

---

## Architektur

```
┌─────────────────────────────────────────────┐
│              Next.js App (TypeScript)        │
│                                             │
│  ┌──────────────┐   ┌─────────────────────┐ │
│  │  Frontend    │   │   API Routes        │ │
│  │  (React PWA) │◄──│  /api/colonies      │ │
│  │              │   │  /api/apiaries      │ │
│  │  Service     │   │  /api/inspections   │ │
│  │  Worker      │   │  /api/nfc           │ │
│  └──────────────┘   └─────────────────────┘ │
│         │                    │               │
│         ▼                    ▼               │
│  ┌─────────────┐    ┌───────────────────┐   │
│  │ IndexedDB   │    │  Prisma ORM       │   │
│  │ (Offline-   │    │  + PostgreSQL     │   │
│  │  Cache)     │    │  (Supabase)       │   │
│  └─────────────┘    └───────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Datenmodell

```
User
 └── Apiary (Standort)
       └── Colony (Volk)
             ├── Inspection (Stockkarte/Inspektion)
             │     ├── InspectionItem (einzelne Kriterien)
             │     └── Treatment (Behandlung, Fütterung, Varroamittel)
             └── NfcTag (zugeordneter RFID/NFC-Chip)
                   └── NfcAction (was beim Scan gebucht wird)
```

### Tabellen

| Tabelle | Wichtige Felder |
|---|---|
| `User` | id, email, passwordHash, plan, createdAt |
| `Apiary` | id, name, location (lat/lng), notes, userId |
| `Colony` | id, name, queenYear, queenColor, apiaryId |
| `Inspection` | id, date, notes, colonyId, createdOffline |
| `InspectionItem` | id, key (z.B. "varroa", "population"), value, inspectionId |
| `Treatment` | id, type (feeding/varroa/other), amount, unit, date, colonyId |
| `NfcTag` | id, uid (Chip-UID), label, colonyId |
| `NfcAction` | id, type (inspection/feeding/treatment), defaultValues (JSON), nfcTagId |

---

## Seiten & Routing

### Öffentlich
- `/` — Landingpage (Hero, Features, Pricing)
- `/login` — Anmeldung
- `/register` — Registrierung

### App (authentifiziert, unter `/app`)

| Route | Beschreibung |
|---|---|
| `/app` | Dashboard — Standort-Übersicht, offene Todos |
| `/app/apiaries` | Standort-Liste + Leaflet-Karte |
| `/app/apiaries/[id]` | Standort-Detail mit Völkerliste |
| `/app/colonies/[id]` | Volk-Detail — aktuelle Stockkarte, Inspektions-History |
| `/app/colonies/[id]/inspect` | Neue Inspektion erfassen |
| `/app/nfc/scan` | NFC-Scanner — Chip lesen & Aktion auslösen |
| `/app/nfc/manage` | NFC-Tags verwalten & Völkern zuordnen |

---

## NFC/RFID-Flow

1. User öffnet `/app/nfc/scan`
2. Browser fragt nach NFC-Berechtigung (Web NFC API, Chrome/Android)
3. Chip wird gescannt → UID ausgelesen
4. App sucht in DB (oder lokalem IndexedDB-Cache) nach zugeordnetem Volk
5. Weiterleitung zu Stockkarte **oder** direkte Buchung der hinterlegten Aktion (Fütterung, Behandlung, Inspektion)
6. Bei Offline: Daten in IndexedDB speichern → automatischer Sync bei nächster Verbindung

---

## PWA & Offline-Strategie

- **Installierbar** auf iOS & Android (Homescreen-Icon, Standalone-Modus)
- **Service Worker** (next-pwa): statische Assets + API-Responses cachen
- **IndexedDB**: Inspektionen und NFC-Aktionen lokal speichern wenn offline
- **Sync-Logik**: Background Sync API (Chrome) oder manueller Sync beim App-Start
- Push-Benachrichtigungen: out of scope für MVP, vorgesehen für spätere Phase

---

## Out of Scope (MVP)

- Abo-Verwaltung / Bezahlung
- Honey-Chargen-Verwaltung
- Königinnenzucht-Modul
- Buchhaltungsmodul
- Multi-Sprache (zunächst nur Deutsch)

---

## Offene Entscheidungen

- Name / Branding der Plattform (noch nicht festgelegt)
- iOS-NFC: Web NFC API wird von Safari **nicht** unterstützt — für iOS ggf. QR-Code als Fallback
