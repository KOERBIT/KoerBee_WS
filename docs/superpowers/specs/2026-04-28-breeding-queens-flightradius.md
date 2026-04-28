# Spec: Zucht-Königinnen-Register & Flugradius-Visualisierung

**Date**: 2026-04-28  
**Status**: Design Approved

---

## 1. Overview

Drei neue Features für das Zucht-Management:

1. **Königinnen-Register**: Zentrale Übersicht aller geschlüpften Königinnen mit eindeutigen Nummern
2. **Zucht-Report**: Interaktiver Report mit Markierung von Zuchtreihen und vollständiger Historie
3. **Flugradius-Visualisierung**: Kreis auf Standortkarte zur Visualisierung des Sammelbereichs

---

## 2. Feature 1: Königinnen-Register

### 2.1 Data Model

Neue Felder in `BreedingBatch`:
- `queensIds`: JSON-Array mit eindeutigen Nummern der geschlüpften Königinnen
  - Format: `{ id: string, number: string, hatchDate: DateTime, status: 'hatched' | 'mated' | 'distributed', notes?: string }`

Alternative: Neue Tabelle `Queen` mit Relations zu `BreedingBatch`. **Entscheidung**: Simpler: Array in BreedingBatch, da maximal ~20 Königinnen pro Batch.

### 2.2 Königinnen-Nummern-Generierung

Beim Speichern des "Schlupf"-Events (wenn `queensHatched` eingegeben wird):
- Lese `BreedingLine.name` (z.B. "Carnica")
- Hole `BreedingEvent.date` (Schlupfdatum, z.B. 2026-04-15)
- Zähle bereits existierende Königinnen mit gleichem (Line + Datum)
- Generiere Nummern: `Carnica-2026-04-15-001`, `Carnica-2026-04-15-002`, etc.
- Speichere als Array in `BreedingBatch.queensIds`

### 2.3 UI: Königinnen-Register Seite

**Route**: `/dashboard/breeding/queens`

**Layout**:
- Header: "Königinnen-Register" + Zuchtreihen-Filter (Dropdown, mehrfach selektierbar)
- Tabelle mit Spalten:
  - Nummer (z.B. "Carnica-2026-04-15-001")
  - Schlupfdatum
  - Zuchtreihe
  - Batch-Info (Graftdatum, Muttervolk)
  - Status (Badge: "geschlüpft" grün, "begattet" amber, "verteilt" grau)
  - Aktionen: Status ändern (Dropdown), Notizen (Icon)
  
**Sortierung**: Standardmäßig nach Schlupfdatum (neuest zuerst), sortierbar nach Nummer/Zuchtreihe
**Filter**: Nach Zuchtreihe, Datumsbereich, Status

---

## 3. Feature 2: Zucht-Report mit Markierung

### 3.1 UI: Markierungslogik in Zuchtkalender

In der bestehenden Zuchtkalender-Seite (`/dashboard/breeding`):
- Neben jeder Zuchtreihen-Card: **Checkbox** zum Markieren
- Oben rechts: **"Report generieren"-Button** (nur aktiv wenn ≥1 Zuchtreihe markiert)
- Button öffnet Modal oder navigiert zu neuer Report-Seite

### 3.2 Report-Seite

**Route**: `/dashboard/breeding/report`

**Input**: 
- GET-Parameter: `lineIds=id1,id2,id3` (markierte Zuchtreihen)

**Output — Interaktiver Report mit Sections**:

#### A. Zusammenfassung
- Zuchtreihen-Liste (welche enthalten sind)
- Zeitraum (von erstem bis letztem Batch)
- Gesamt-Königinnen: X geschlüpft, Y begattet, Z verteilt

#### B. Batches (Akkordeon/Expandable)
Pro Batch:
- Graftdatum, Muttervolk
- Timeline (wie in Kalender-Seite)
- Königinnen-Liste mit eindeutigen Nummern
- Überlebenschancen (Larven → angenommen → geschlüpft → begattet)

#### C. Alle Königinnen (Tabelle)
- Wie Königinnen-Register, aber gefiltert auf diese Zuchtreihen
- Sortierbar nach Nummer, Datum, Status

### 3.3 PDF-Export
Button: "Als PDF herunterladen"
- Erzeugt ein strukturiertes PDF mit allen Sections
- Nutzt bestehende `breeding-report.ts` Library

---

## 4. Feature 3: Flugradius auf Standortkarte

### 4.1 Data Model

Neues Feld in `Apiary`:
- `flightRadius`: Float (optional, in km, z.B. 2.5)

### 4.2 UI: Apiary-Detail-Seite

Auf `/dashboard/apiaries/[id]`:
- Neues Input-Feld: "Flugradius (km)" neben oder unter Koordinaten-Eingabe
- Placeholder: "z.B. 2 oder 3.5"
- Speichern mit Apiary-Update

### 4.3 Kartendarstellung

In `ApiaryMap.tsx` / `ApiaryMapClient.tsx`:
- Falls `flightRadius` gesetzt: Zeichne einen Kreis um die Marker-Position
- Radius in Pixeln berechnen: `radiusKm → mercator projection`
- Kreis-Farbe: Halbtransparent Amber/Orange (z.B. `rgba(245, 158, 11, 0.2)`)
- Kreis-Umriss: 1px Amber (z.B. `rgba(245, 158, 11, 0.5)`)
- Bei Zoom/Pan aktualisiert sich Kreis-Größe korrekt

---

## 5. Technical Details

### 5.1 Database Migration

Neue Felder:
```
BreedingBatch.queensIds: Json (optional)
Apiary.flightRadius: Float (optional)
```

### 5.2 API Endpoints

**Neue/geänderte Endpoints**:

| Endpoint | Method | Beschreibung |
|----------|--------|---|
| `/api/breeding/queens` | GET | Alle Königinnen (mit Filter-Params: lineId, dateFrom, dateTo, status) |
| `/api/breeding/report` | GET | Report-Daten für markierte Zuchtreihen (Param: lineIds) |
| `/api/apiaries/[id]` | PATCH | Flight radius updaten |

### 5.3 Components

**Neue Components**:
- `QueensRegisterTable.tsx` — Tabelle für Register & Report
- `BreedingReportView.tsx` — Report-Seite mit Sections
- `FlightRadiusCircle.tsx` — Leaflet Circle-Komponente

**Geänderte Components**:
- `ApiaryMap.tsx` — FlightRadius-Circle hinzufügen
- `page.tsx` (breeding) — Checkboxes + Report-Button
- `ApiaryDetailActions.tsx` oder Apiary-Detail-Page — FlightRadius-Input

---

## 6. User Workflows

### Workflow 1: Königinnen-Register anschauen
1. User klickt auf "Königinnen-Register" (neue Tab im Breeding-Bereich)
2. Sieht alle geschlüpften Königinnen mit Nummern, Datum, Status
3. Kann nach Zuchtreihe filtern

### Workflow 2: Report generieren
1. User geht zu "Zuchtkalender"
2. Markiert eine oder mehrere Zuchtreihen (Checkbox)
3. Klickt "Report generieren"
4. Sieht interaktive Report-Seite mit allen Infos
5. Kann als PDF exportieren

### Workflow 3: Flugradius setzen
1. User öffnet einen Standort
2. Gibt "Flugradius: 2.5" ein
3. Speichert
4. Auf der Karte sieht er einen Kreis um den Standort

---

## 7. Success Criteria

- [ ] Königinnen bekommen beim Schlupf eindeutige Nummern (Format: Line-YYYY-MM-DD-NNN)
- [ ] Königinnen-Register ist durchsuchbar und filterbar
- [ ] Report zeigt komplette Zucht-Historie mit Königinnen-Nummern
- [ ] Report ist als PDF exportierbar
- [ ] Flugradius kann pro Standort gespeichert werden
- [ ] Kreis wird korrekt auf der Karte angezeigt und aktualisiert sich bei Zoom/Pan

---

## 8. Future Considerations

- Königinnen-Status "begattet"/"verteilt" später durch UI änderbar
- Möglichkeit, Königinnen zu einem Volk zuzuordnen
- Export von Königinnen-Liste als CSV
- Standortkarte: Mehrere Flugradii überlagern (Vergleich)
