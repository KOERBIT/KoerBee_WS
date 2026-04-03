# Design: NFC-Aktionen, Larvenstadium-Grafik, Wetter mit Karte

**Datum:** 2026-04-03  
**Projekt:** Bee — Imkerei-Management-App  
**Stack:** Next.js 16, Prisma v7, Supabase, Vercel

---

## 1. NFC-Aktionen → Chronik

### Kontext
Die NFC-Scan-Seite (`/dashboard/nfc/scan`) unterstützt bereits Aktionen (inspection, varroa, feeding, honey_harvest). Diese erzeugen Inspection- bzw. Treatment-Einträge, die in der Volk-Chronik erscheinen. Die UX wird für jede Aktion gezielt verbessert.

### Aktionstypen und UX

**Durchschau (`inspection`)**  
Nach Tag-Erkennung erscheint ein Mini-Formular mit ausschließlich tippbaren Feldern — kein Tippen nötig:
- Varroa-Befall: `<1%` / `1–3%` / `3–5%` / `>5%`
- Volksstärke: 5 Punkte-Dots (1–5)
- Königin gesehen: `Ja` / `Nein` / `Eilage gesehen`
- Temperament: `Ruhig` / `Normal` / `Aggressiv`
- Brutnest: `Gut` / `Lückig` / `Schlecht`
- Schwarmstimmung: `Keine` / `Weiselzellen` / `Starke Triebe`

Alle Felder optional. Beim Buchen werden die Werte als InspectionItems gespeichert (bestehende Struktur). Chronik-Eintrag: "Durchschau" mit den gewählten Werten.

**Honigernte (`honey_harvest`)**  
Keine Extra-Felder — nur "Jetzt buchen"-Button. Erzeugt Treatment `type='honey_harvest'`.

**Varroabehandlung (`varroa`)**  
Keine Mittelauswahl, nur "Jetzt buchen". Erzeugt Treatment `type='varroa'`.

**Füttern (`feeding`)**  
- Menge per +/− Stepper, Schritte à 0,5 kg
- Futtertyp: `Zuckerwasser` / `Futterteig` (Tap-Toggle)
- Erzeugt Treatment `type='feeding'` mit amount + unit

### Änderungen am Code
- `src/app/dashboard/nfc/scan/page.tsx` — Umbau der Action-UI pro Aktionstyp
- `/api/nfc/execute/route.ts` — Für `inspection`: InspectionItems aus Request übernehmen
- Keine neuen DB-Modelle nötig (bestehende Inspection/InspectionItem/Treatment-Tabellen)

---

## 2. Larvenstadium-Grafik im Zuchtkalender

### Kontext
Der Zuchtkalender (`/dashboard/breeding`) zeigt Batches mit Phasen-Tags als klickbare Buttons. Es fehlt eine visuelle Fortschritts-Grafik.

### Design
Pro Batch wird eine horizontale Phasen-Leiste angezeigt mit 6 Icons verbunden durch Linien:

| Phase | Tag | Icon |
|-------|-----|------|
| Umlarven | T0 | Larve in Wabenzelle (SVG) |
| Stiftkontrolle | T4 | Lupe über Larve (SVG) |
| Schlupf | T11 | Biene schlüpft aus Wabe (SVG) |
| Begattung | T14 | Königin im Flug mit Krone (SVG) |
| Eilage | T21 | Wabe mit Eiern (SVG) |
| Beurteilung | T28 | Biene mit Stern (SVG) |

**Zustände:**
- Erledigt (`completed=true`): grüner Hintergrund, grüner Haken-Badge
- Aktiv (nächste offene Phase): goldener Ring, fetter Label
- Zukünftig: grauer Hintergrund

**Chip unter der Leiste:** "Nächstes: [Phase] in X Tagen (Datum)"

### Änderungen
- `src/app/dashboard/breeding/page.tsx` — `PhaseTimeline`-Komponente einbauen, die bestehenden Event-Buttons ersetzen/ergänzen
- Neue SVG-Icons als Inline-Komponenten (keine externe Lib nötig)

---

## 3. Wetter am Bienenstand — Karte + Bienen-Icons

### Kontext
`WeatherWidget` (Open-Meteo, kein API-Key) existiert und läuft auf der Apiary-Detailseite wenn lat/lng gesetzt. Aktuell: Emoji-Icons, kein Map, keine GPS-Eingabe.

### Verbesserungen

**A) Bienen-SVG-Wettericons**  
Ersetzt Emoji durch eigene SVG-Illustrationen: Biene fliegt durch entsprechende Wetterszene (Wolken, Regen, Sonne). Implementiert als `BeeWeatherIcon`-Komponente mit Switch über WMO-Wettercodes (gruppiert: sonnig, bewölkt, regen, schnee, gewitter).

**B) OpenStreetMap mit Leaflet**  
Auf der Apiary-Detailseite (`/dashboard/apiaries/[id]/page.tsx`) wird unterhalb des Headers eine interaktive Karte gezeigt wenn lat/lng gesetzt:
- Leaflet.js (Client-Component, kein SSR)
- OpenStreetMap Tiles (kostenlos, kein API-Key)
- Custom Marker: Bienenstock-Icon 🍯 (oder SVG-Pin)
- Karte ist nur lesend (kein Drag-and-Drop-Positionierung)

**C) GPS-Button zum Koordinaten setzen**  
Beim Bearbeiten eines Standorts (Edit-Modal in `ApiaryDetailActions`) erscheint ein "GPS jetzt setzen"-Button:
- Ruft `navigator.geolocation.getCurrentPosition()` auf
- Füllt lat/lng Felder automatisch
- Fallback: Manuelle Eingabe bleibt erhalten
- Nützlich: User steht direkt am Stand und tippt den Button

### Pakete
- `leaflet` + `react-leaflet` (Client-only, kein SSR-Problem wenn dynamisch importiert)

### Änderungen
- `src/components/WeatherWidget.tsx` — BeeWeatherIcon statt Emoji
- `src/components/ApiaryMap.tsx` — Neue Client-Komponente mit Leaflet-Karte
- `src/app/dashboard/apiaries/[id]/page.tsx` — ApiaryMap einbinden
- `src/app/dashboard/apiaries/ApiaryActions.tsx` — GPS-Button im Edit-Modal

---

## Nicht in Scope
- iOS App (separates Projekt, spätere Phase)
- Dashboard-Wetter (nur auf Apiary-Detailseite, nicht auf Hauptdashboard)
- Neue Datenbankmodelle
- Wetter-Caching in DB
