# Kassenbuch — Lagerbestand & Produktkatalog Design Spec

**Date:** 2026-04-07  
**Status:** Approved  
**Sub-project:** 1 of 2 (Lagerbestand + Produktkatalog)

---

## Overview

Erweiterung des bestehenden Kassenbuchs um Füllmengen bei Produkten und einen vollständigen Lagerbestand. Verkäufe und Kommissions-Abrechnungen buchen automatisch vom Lager ab. Verkäufe werden blockiert wenn der Lagerbestand nicht ausreicht.

---

## Schema-Änderungen

### Product-Modell (Erweiterung)

```prisma
model Product {
  id               String            @id @default(cuid())
  name             String
  unit             String            @default("Stück")
  price            Float
  description      String?
  fillAmount       Float?            // NEU: Füllmenge (z.B. 500)
  fillUnit         String?           // NEU: Einheit (g / ml / kg)
  stockQuantity    Int               @default(0)  // NEU: Lagerbestand
  userId           String
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  saleItems        SaleItem[]
  consignmentItems ConsignmentItem[]
  createdAt        DateTime          @default(now())
}
```

Keine weiteren Schema-Änderungen. Alle anderen Modelle (Sale, SaleItem, Consignment, ConsignmentItem, Expense) bleiben unverändert.

---

## API-Änderungen

### `PUT /api/kassenbuch/products/[id]`
- Bestehend — erweitern um `fillAmount`, `fillUnit`, `stockQuantity` Felder
- `stockQuantity` darf über PUT nicht direkt gesetzt werden (nur über Einbuchen-Endpunkt)

### `POST /api/kassenbuch/products/[id]/stock` (NEU)
Einbuchen: addiert Menge zum aktuellen Lagerbestand.
```json
Request:  { "quantity": 12 }
Response: { "stockQuantity": 36 }
```
- `quantity` muss > 0 sein (validieren)

### `POST /api/kassenbuch/sales` (geändert)
**Vor dem Erstellen:** Prüft für jeden SaleItem ob `product.stockQuantity >= item.quantity`.
- Wenn nicht genug: HTTP 409 mit Body `{ "error": "insufficient_stock", "items": [{ "productId": "...", "productName": "...", "requested": 3, "available": 0 }] }`
- Wenn OK: Erstellt Sale und reduziert `stockQuantity` pro Produkt atomar in einer Prisma-Transaktion

### `PATCH /api/kassenbuch/consignments/[id]` (geändert)
Wenn `status` → `"settled"`:
- Für jeden ConsignmentItem: reduziert `product.stockQuantity` um `soldQuantity` (nicht um `quantity`)
- Falls Lagerbestand eines Produkts durch die Abrechnung negativ würde: HTTP 409 mit gleichem Fehlerformat wie Sales
- Erstellt Sale-Record wie bisher (bestehende Logik bleibt)
- Alles in einer Prisma-Transaktion

---

## UI-Änderungen

### Artikel-Tab

**Produktkarte** (pro Artikel):
- Name + Füllmenge (z.B. "500 g") + Preis
- Lagerbestand-Badge (farbkodiert):
  - Grün (`bg-green-50`): stockQuantity > 5
  - Gelb (`bg-yellow-50`): stockQuantity 1–5
  - Rot (`bg-rose-50`): stockQuantity === 0
- Buttons: **+ Einbuchen** · Bearbeiten · Löschen

**Einbuchen-Formular** (inline, expandiert unter dem Button):
- Stepper mit − / Zahl / + (Schritt 1, Minimum 1)
- Zeigt Vorschau: "Neuer Bestand: X"
- Button "Einbuchen bestätigen" → `POST /api/kassenbuch/products/[id]/stock`

**Neuer-Artikel-Modal** (erweitert):
- Neue Felder: Füllmenge (Zahl) + Einheit (Dropdown: g / ml / kg / Stück)
- Füllmenge und Einheit sind optional (für Artikel ohne Mengenangabe wie "Kerzen")
- Lagerbestand startet bei 0, wird nicht im Modal eingegeben (über Einbuchen-Flow)

### Verkauf-Tab

**Verkaufs-Modal** (geändert):
- Pro Artikel-Zeile: kleiner Indikator unter dem Artikel-Dropdown
  - Grüner Punkt: "Lager: X verfügbar"
  - Roter Punkt + Text: "Nur X im Lager — Bitte erst einbuchen" wenn `quantity > stockQuantity`
- Buchen-Button deaktiviert solange ein Artikel zu wenig Lagerbestand hat
- Fehlermeldung unter dem Button: "Nicht genug Lagerbestand für [Artikelname]"
- Nach erfolgreichem Verkauf: Lagerbestand wird serverseitig reduziert

### Kommissions-Tab

**Kommission abrechnen** (geändert — ersetzt den "Abgerechnet"-Button):
- Neues Modal statt direktem Klick
- Pro ConsignmentItem: Artikelname + "Platziert: X" + Stepper "Wie viele verkauft?" (0 bis quantity)
- Live-Summe des Erlöses
- Button "Abrechnen & Verkauf buchen"
- Fehler wenn Lagerbestand nicht reicht (roter Hinweis pro Item)

---

## Lagerbestand-Logik

| Aktion | Lageränderung |
|---|---|
| Einbuchen | `stockQuantity += quantity` |
| Verkauf buchen | `stockQuantity -= saleItem.quantity` (pro Produkt) |
| Kommission abrechnen | `stockQuantity -= consignmentItem.soldQuantity` (pro Produkt) |
| Kommission zurückgeholt | Keine Lageränderung (Ware kommt zurück, muss manuell eingebucht werden) |
| Artikel löschen | Erlaubt nur wenn `stockQuantity === 0` (sonst Fehlermeldung) |

**Negativer Lagerbestand:** Wird serverseitig blockiert (HTTP 409). UI zeigt Hinweis.

---

## Nicht im Scope (Sub-Projekt 1)

- Lagerhistorie / Bewegungslog
- Mindeststückzahl / automatische Benachrichtigungen
- Lagerwert in der Übersicht (→ Sub-Projekt 2)
- Export-Verbesserungen (→ Sub-Projekt 2)
- Gewinn/Verlust-Übersicht (→ Sub-Projekt 2)
