---
name: Lagerkorrektur & Völker-Metadaten
description: Zwei unabhängige Features für Kassenbuch (Lagerkorrektur mit MHD) und Völker (Gründungsdatum + Notizen)
type: design
---

# Lagerkorrektur & Völker-Metadaten

## Feature 1: Lagerkorrektur im Kassenbuch

### Anforderung
- Manuelles Korrigieren von Lagerbeständen (erhöhen und senken)
- Dokumentation mit Grund
- Chargennummer und Mindesthaltbarkeitsdatum erfassen
- Korrektur-Historie im Kassenbuch sichtbar machen (separater Tab)

### Datenmodell
Neue Prisma-Tabelle `StockCorrection`:
```
- id (String, @id)
- productId (String, Fremdschlüssel zu Product)
- quantity (Int) - positive oder negative Menge
- reason (String) - Grund der Korrektur
- batchNumber (String, optional) - Chargennummer
- expiryDate (DateTime, optional) - Mindesthaltbarkeitsdatum
- userId (String, Fremdschlüssel zu User)
- createdAt (DateTime, default: now())
```

Product-Modell wird um Relation erweitert:
```
stockCorrections: StockCorrection[]
```

### API-Endpoint
**POST `/api/kassenbuch/products/[id]/stock-correction`**

Request-Body:
```json
{
  "quantity": -5,
  "reason": "Abweichung Inventur",
  "batchNumber": "2025-HONIG-003",
  "expiryDate": "2026-12-31"
}
```

Response:
```json
{
  "stockQuantity": 45,
  "correctionId": "cuid123"
}
```

Validierungen:
- Quantity muss Integer sein (kann negativ sein)
- Reason erforderlich
- batchNumber und expiryDate optional
- UserId muss mit Session übereinstimmen
- Product muss zum User gehören

### UI-Komponenten

**Neuer Tab: "Lagerkorrektionen"** auf Kassenbuch-Seite
- Tabelle mit Spalten:
  - Produktname
  - Menge (mit ± Vorzeichen, farblich: Grün für +, Rot für -)
  - Grund
  - Chargennummer
  - MHD
  - Datum
- Sortierbar nach Datum (neueste zuerst)
- Button "Neue Korrektur"

**Modal "Neue Korrektur":**
- Dropdown "Produkt" (Required)
- Input "Menge" (Required, Integer, kann negativ sein)
- Textarea "Grund" (Required)
- Input "Chargennummer" (Optional)
- Datepicker "Mindesthaltbarkeitsdatum" (Optional)
- Buttons: "Speichern", "Abbrechen"

Nach Speichern:
- Modal schließt
- Tabelle aktualisiert (neue Zeile oben)
- Produkt-Lagerbestand aktualisiert

### Fehlerbehandlung
- Produkt nicht gefunden → 404
- Ungültige Eingaben → 400 mit Fehlermeldung
- Unauthorized → 401

---

## Feature 2: Völker-Metadaten

### Anforderung
- Separates Feld für Gründungsdatum (unterschiedlich vom `createdAt` in DB)
- Notizen-Feld für freien Text zu Volk-Infos

### Datenmodell
Zwei neue Felder in `Colony` Modell:
```
- foundedAt (DateTime, optional) - wann das Volk gegründet wurde
- notes (String, optional) - freier Text für Notizen und Infos
```

### API-Integration
Existierender Endpoint `PUT /api/colonies/[id]` wird erweitert:

Request-Body kann jetzt auch enthalten:
```json
{
  "foundedAt": "2024-03-15",
  "notes": "Starke Volkskraft, gute Bruttätigkeit"
}
```

### UI-Komponenten

**Im Colony-Detail-View (bestehende Seite erweitern):**

Neuer Abschnitt "Volk-Informationen":
- **Gründungsdatum**: Datepicker (optional, default leer)
- **Notizen**: Textarea (optional, mehrzeilig, unbegrenzt)

Diese Felder sind edierbar (Button "Bearbeiten" togglet Edit-Modus wie bei anderen Colony-Feldern).

### Fehlerbehandlung
- Colony nicht gefunden → 404
- Unauthorized → 401
- Ungültiges Datum → 400

---

## Implementierungsreihenfolge

1. **Feature 1 zuerst** (Lagerkorrektur) – größere Änderung, separater Tab
2. **Feature 2 danach** (Völker-Metadaten) – einfacher, nur 2 Felder

Beide sind unabhängig und können parallel getestet werden.

---

## Migration & Datenbank

- Prisma Migration erforderlich für StockCorrection Tabelle
- Colony-Modell: foundedAt und notes optional → keine Daten-Migration nötig
- Nach Migration: `npx prisma migrate dev`

