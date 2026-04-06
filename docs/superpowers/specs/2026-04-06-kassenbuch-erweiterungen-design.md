# Kassenbuch-Erweiterungen Design Spec

## Ziel

Drei Erweiterungen des bestehenden Kassenbuchs:
1. Kommissionen bei Abrechnung automatisch in die Gesamtverkaufsliste übernehmen
2. Ausgaben erfassen und im Kassenbuch anzeigen
3. Monatlichen PDF- und CSV-Export des Kassenbuchs

---

## Bestehende Architektur (Kontext)

Das Kassenbuch besteht aus:
- `prisma/schema.prisma` — Modelle: `Product`, `Sale`, `SaleItem`, `Consignment`, `ConsignmentItem`, `Customer`
- `src/app/api/kassenbuch/` — REST-Routen für products, sales, consignments
- `src/app/dashboard/kassenbuch/page.tsx` — Single-Page Client-Komponente mit Tabs: `verkauf | kommission | artikel`

---

## Teil 1: Kommission → Gesamtverkaufsliste (Auto-Sale)

### Problem
Wenn eine Kommission auf `status='settled'` gesetzt wird, werden die verkauften Mengen (`soldQuantity`) nicht in die `Sale`-Tabelle übernommen. Die Verkaufsliste ist damit unvollständig.

### Lösung
In `src/app/api/kassenbuch/consignments/[id]/route.ts` (PATCH-Handler):

Wenn `status === 'settled'` gesetzt wird UND noch kein Auto-Sale existiert (prüfen via `notes` enthält `"Via Kommission"`), wird nach dem Update automatisch ein neuer `Sale` erstellt:

```typescript
// Nur wenn Status auf 'settled' wechselt und ConsignmentItems mit soldQuantity > 0 vorhanden
const soldItems = updatedConsignment.items.filter(i => i.soldQuantity > 0)
if (status === 'settled' && soldItems.length > 0) {
  const total = soldItems.reduce((sum, i) => sum + i.soldQuantity * i.price, 0)
  await prisma.sale.create({
    data: {
      userId: session.user.id,
      date: new Date(),
      customerName: updatedConsignment.locationName,
      customerId: updatedConsignment.customerId,
      notes: `Via Kommission: ${updatedConsignment.locationName ?? ''}`,
      total,
      items: {
        create: soldItems.map(i => ({
          productId: i.productId,
          quantity: i.soldQuantity,
          price: i.price,
          total: i.soldQuantity * i.price,
        })),
      },
    },
  })
}
```

**Wichtig:** Nur beim Übergang auf `'settled'` — nicht bei jedem PATCH-Aufruf. Guard: `status === 'settled' && consignment.status !== 'settled'` (Status war vorher nicht settled).

---

## Teil 2: Ausgaben erfassen

### Neues Prisma-Modell `Expense`

```prisma
model Expense {
  id          String   @id @default(cuid())
  date        DateTime @default(now())
  amount      Float
  category    String   @default("Sonstiges")
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}
```

Kategorien (fest kodiert, kein eigenes Modell): `"Material"`, `"Tierarzt"`, `"Ausrüstung"`, `"Fahrt"`, `"Sonstiges"`

### Neue API-Routen

**`src/app/api/kassenbuch/expenses/route.ts`** — GET (alle Ausgaben des Users) + POST (neue Ausgabe)

**`src/app/api/kassenbuch/expenses/[id]/route.ts`** — DELETE

### UI: Neuer Tab "Ausgaben"

`Tab`-Typ erweitert: `'verkauf' | 'kommission' | 'artikel' | 'ausgaben'`

Neuer Tab zeigt:
- Button "Ausgabe erfassen" → Inline-Formular: Datum, Betrag, Kategorie (Select), Beschreibung (optional)
- Liste aller Ausgaben sortiert nach Datum absteigend
- Summe aller Ausgaben als Footer

---

## Teil 3: Monatlicher PDF & CSV Export

### UI

Neuer "Export"-Button im Kassenbuch-Header (neben den bestehenden Aktionsbuttons). Klick öffnet ein kleines Modal mit:
- Monat-Selector (1–12) + Jahr-Selector (aktuelles Jahr ± 2)
- Zwei Buttons: "CSV herunterladen" und "PDF herunterladen"

### Daten-Scope des Exports

Der Export für Monat M/Jahr Y enthält:
- **Einnahmen:** Alle `Sale`-Einträge mit `date` im gewählten Monat (inkl. Auto-Sales aus Kommissionen)
- **Ausgaben:** Alle `Expense`-Einträge mit `date` im gewählten Monat
- **Saldo:** Einnahmen gesamt − Ausgaben gesamt

### CSV-Format (client-seitig generiert, kein Package nötig)

```
Datum;Typ;Beschreibung;Betrag
01.04.2026;Einnahme;Direktverkauf Markt;45.00
03.04.2026;Einnahme;Via Kommission: Bäckerei Müller;120.00
05.04.2026;Ausgabe;Material — Bienenwachs;18.50
...
;;Einnahmen gesamt;165.00
;;Ausgaben gesamt;18.50
;;Saldo;146.50
```

Download via `Blob` + `<a download>` — kein Server-Roundtrip.

### PDF-Format (client-seitig via `jsPDF` + `jspdf-autotable`)

Packages: `jspdf` und `jspdf-autotable` (beide bereits weit verbreitet, kein Server nötig)

Aufbau:
- Titel: "Kassenbuch — April 2026"
- Tabelle Einnahmen (Datum, Beschreibung, Betrag)
- Tabelle Ausgaben (Datum, Kategorie, Beschreibung, Betrag)
- Zusammenfassung: Einnahmen, Ausgaben, Saldo

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `prisma/schema.prisma` | Neues `Expense`-Modell + `User`-Relation |
| `src/app/api/kassenbuch/expenses/route.ts` | Neu: GET + POST |
| `src/app/api/kassenbuch/expenses/[id]/route.ts` | Neu: DELETE |
| `src/app/api/kassenbuch/consignments/[id]/route.ts` | Auto-Sale bei `settled`-Übergang |
| `src/app/dashboard/kassenbuch/page.tsx` | Ausgaben-Tab + Export-Modal + jsPDF |

---

## Migration

```bash
npx prisma migrate dev --name add-expense-model
```

---

## Manuelle Verifikation

1. **Auto-Sale:** Kommission anlegen → Mengen eintragen → auf "Abgerechnet" setzen → Verkaufsliste prüfen → neuer Eintrag erscheint mit korrektem Betrag
2. **Ausgaben:** Neue Ausgabe erfassen → erscheint im Tab + korrekte Summe
3. **CSV:** Monat wählen → CSV herunterladen → in Excel öffnen → Einnahmen/Ausgaben/Saldo korrekt
4. **PDF:** Monat wählen → PDF herunterladen → Tabellen und Saldo korrekt
