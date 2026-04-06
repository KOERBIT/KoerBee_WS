# Kassenbuch-Erweiterungen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kassenbuch um drei Features erweitern: automatische Übernahme von Kommissionsverkäufen in die Verkaufsliste, Ausgaben-Tracking, und monatlicher PDF/CSV-Export.

**Architecture:** Task 1 erweitert das Prisma-Schema + Migration. Task 2 fügt die Expense-API hinzu. Task 3 erweitert den Consignment-PATCH-Handler um Auto-Sale-Logik. Task 4 erweitert die Kassenbuch-UI um Ausgaben-Tab und Export-Modal.

**Tech Stack:** Next.js 15 App Router, Prisma v7, PostgreSQL, TypeScript, jsPDF + jspdf-autotable (client-side PDF)

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `prisma/schema.prisma` | Neues `Expense`-Modell + `User`-Relation |
| `src/app/api/kassenbuch/expenses/route.ts` | Neu: GET + POST |
| `src/app/api/kassenbuch/expenses/[id]/route.ts` | Neu: DELETE |
| `src/app/api/kassenbuch/consignments/[id]/route.ts` | Auto-Sale bei `status='settled'`-Übergang |
| `src/app/dashboard/kassenbuch/page.tsx` | Ausgaben-Tab + Export-Modal |

---

## Task 1: Prisma-Schema — Expense-Modell

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Schritt 1: Expense-Modell hinzufügen**

In `prisma/schema.prisma` — füge direkt nach dem `ConsignmentItem`-Modell (nach Zeile ~235) ein:

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

- [ ] **Schritt 2: User-Modell erweitern**

Im `User`-Modell (Zeilen ~9-25) — füge nach `consignments Consignment[]` ein:

```prisma
  expenses    Expense[]
```

- [ ] **Schritt 3: Migration ausführen**

```bash
npx prisma migrate dev --name add-expense-model
```

Erwartetes Ergebnis: `✓ Generated Prisma Client` + Migration-Datei erstellt.

- [ ] **Schritt 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: Expense-Modell — Ausgaben-Tracking im Kassenbuch"
```

---

## Task 2: Expense-API — GET, POST, DELETE

**Files:**
- Create: `src/app/api/kassenbuch/expenses/route.ts`
- Create: `src/app/api/kassenbuch/expenses/[id]/route.ts`

- [ ] **Schritt 1: `expenses/route.ts` erstellen**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { date, amount, category, description } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Betrag fehlt' }, { status: 400 })
  const expense = await prisma.expense.create({
    data: {
      date: date ? new Date(date) : new Date(),
      amount: parseFloat(amount),
      category: category || 'Sonstiges',
      description: description || null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(expense, { status: 201 })
}
```

- [ ] **Schritt 2: `expenses/[id]/route.ts` erstellen**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const expense = await prisma.expense.findFirst({ where: { id, userId: session.user.id } })
  if (!expense) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Schritt 3: TypeScript-Check**

```bash
npx tsc --noEmit
```

Erwartetes Ergebnis: keine Fehler.

- [ ] **Schritt 4: Commit**

```bash
git add src/app/api/kassenbuch/expenses/
git commit -m "feat: Expense-API — GET, POST, DELETE /api/kassenbuch/expenses"
```

---

## Task 3: Auto-Sale bei Kommissions-Abrechnung

**Files:**
- Modify: `src/app/api/kassenbuch/consignments/[id]/route.ts`

Wenn eine Kommission auf `status='settled'` gesetzt wird und vorher nicht settled war, wird automatisch ein `Sale`-Eintrag mit den verkauften Mengen erstellt.

- [ ] **Schritt 1: PATCH-Handler erweitern**

Ersetze die gesamte `PATCH`-Funktion in `src/app/api/kassenbuch/consignments/[id]/route.ts`:

```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const consignment = await prisma.consignment.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { product: true } } },
  })
  if (!consignment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const { status, items } = await req.json()

  const updated = await prisma.consignment.update({
    where: { id },
    data: {
      status: status ?? consignment.status,
      ...(items && {
        items: {
          updateMany: items.map((i: { id: string; soldQuantity?: number; returnedQuantity?: number }) => ({
            where: { id: i.id },
            data: {
              ...(i.soldQuantity != null && { soldQuantity: i.soldQuantity }),
              ...(i.returnedQuantity != null && { returnedQuantity: i.returnedQuantity }),
            },
          })),
        },
      }),
    },
    include: { items: { include: { product: true } }, customer: true },
  })

  // Auto-Sale: nur beim Übergang auf 'settled'
  if (status === 'settled' && consignment.status !== 'settled') {
    const soldItems = updated.items.filter(i => i.soldQuantity > 0)
    if (soldItems.length > 0) {
      const total = soldItems.reduce((sum, i) => sum + i.soldQuantity * i.price, 0)
      await prisma.sale.create({
        data: {
          userId: session.user.id,
          date: new Date(),
          customerName: updated.locationName,
          customerId: updated.customerId,
          notes: `Via Kommission: ${updated.locationName ?? ''}`.trim().replace(/:\s*$/, ''),
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
  }

  return NextResponse.json(updated)
}
```

- [ ] **Schritt 2: TypeScript-Check**

```bash
npx tsc --noEmit
```

Erwartetes Ergebnis: keine Fehler.

- [ ] **Schritt 3: Commit**

```bash
git add src/app/api/kassenbuch/consignments/[id]/route.ts
git commit -m "feat: Kommission settled — Auto-Sale in Verkaufsliste erstellen"
```

---

## Task 4: Kassenbuch-UI — Ausgaben-Tab + Export-Modal

**Files:**
- Modify: `src/app/dashboard/kassenbuch/page.tsx`

Die Kassenbuch-Seite ist eine große Client-Komponente (~400+ Zeilen). Wir fügen hinzu:
1. `Expense`-Interface und `expenses`-State
2. Ausgaben-Formular-States
3. Export-Modal-States
4. `load()` lädt auch Expenses
5. Neuer Tab "Ausgaben" mit Formular + Liste
6. Export-Modal mit Monat/Jahr-Picker + CSV/PDF-Download
7. Stats-Karte für Ausgaben diesen Monat

**Hinweis:** `jsPDF` und `jspdf-autotable` müssen zuerst installiert werden.

- [ ] **Schritt 1: jsPDF installieren**

```bash
npm install jspdf jspdf-autotable
npm install --save-dev @types/jspdf-autotable
```

Erwartetes Ergebnis: Pakete in `node_modules`, `package.json` aktualisiert.

- [ ] **Schritt 2: Interfaces + Tab-Typ erweitern**

Am Anfang von `page.tsx` — ersetze:
```typescript
type Tab = 'verkauf' | 'kommission' | 'artikel'
```
durch:
```typescript
type Tab = 'verkauf' | 'kommission' | 'artikel' | 'ausgaben'
```

Füge nach der `Consignment`-Interface ein:
```typescript
interface Expense { id: string; date: string; amount: number; category: string; description: string | null }
```

- [ ] **Schritt 3: States hinzufügen**

Nach `const [loading, setLoading] = useState(true)` (Zeile ~27) füge ein:
```typescript
const [expenses, setExpenses] = useState<Expense[]>([])

// Expense form
const [showExpense, setShowExpense] = useState(false)
const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10))
const [expAmount, setExpAmount] = useState('')
const [expCategory, setExpCategory] = useState('Sonstiges')
const [expDesc, setExpDesc] = useState('')
const [savingExp, setSavingExp] = useState(false)

// Export modal
const [showExport, setShowExport] = useState(false)
const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1)
const [exportYear, setExportYear] = useState(new Date().getFullYear())
```

- [ ] **Schritt 4: `load()`-Funktion erweitern**

Ersetze die `load`-Funktion:
```typescript
const load = useCallback(async () => {
  const [p, s, c, e] = await Promise.all([
    fetch('/api/kassenbuch/products').then(r => r.json()),
    fetch('/api/kassenbuch/sales').then(r => r.json()),
    fetch('/api/kassenbuch/consignments').then(r => r.json()),
    fetch('/api/kassenbuch/expenses').then(r => r.json()),
  ])
  setProducts(p)
  setSales(s)
  setConsignments(c)
  setExpenses(e)
  setLoading(false)
}, [])
```

- [ ] **Schritt 5: Hilfsfunktionen für Ausgaben hinzufügen**

Nach der `deleteProduct`-Funktion (nach `load()` am Ende von deleteProduct) füge ein:

```typescript
async function saveExpense(e: React.FormEvent) {
  e.preventDefault()
  setSavingExp(true)
  await fetch('/api/kassenbuch/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: expDate, amount: parseFloat(expAmount), category: expCategory, description: expDesc || null }),
  })
  setSavingExp(false)
  setShowExpense(false)
  setExpAmount(''); setExpDesc(''); setExpCategory('Sonstiges')
  load()
}

async function deleteExpense(id: string) {
  if (!confirm('Ausgabe löschen?')) return
  await fetch(`/api/kassenbuch/expenses/${id}`, { method: 'DELETE' })
  load()
}
```

- [ ] **Schritt 6: Export-Hilfsfunktionen hinzufügen**

Nach `deleteExpense` füge ein:

```typescript
const EXPENSE_CATEGORIES = ['Material', 'Tierarzt', 'Ausrüstung', 'Fahrt', 'Sonstiges']

function getExportData() {
  const start = new Date(exportYear, exportMonth - 1, 1)
  const end = new Date(exportYear, exportMonth, 0, 23, 59, 59)
  const filteredSales = sales.filter(s => { const d = new Date(s.date); return d >= start && d <= end })
  const filteredExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end })
  const totalIncome = filteredSales.reduce((s, sale) => s + sale.total, 0)
  const totalExpenses = filteredExpenses.reduce((s, exp) => s + exp.amount, 0)
  return { filteredSales, filteredExpenses, totalIncome, totalExpenses, saldo: totalIncome - totalExpenses }
}

function downloadCsv() {
  const { filteredSales, filteredExpenses, totalIncome, totalExpenses, saldo } = getExportData()
  const monthName = new Date(exportYear, exportMonth - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const rows: string[] = [
    'Datum;Typ;Beschreibung;Betrag',
    ...filteredSales.map(s =>
      `${new Date(s.date).toLocaleDateString('de-DE')};Einnahme;${s.notes ?? s.customerName ?? 'Direktverkauf'};${s.total.toFixed(2)}`
    ),
    ...filteredExpenses.map(e =>
      `${new Date(e.date).toLocaleDateString('de-DE')};Ausgabe;${e.category}${e.description ? ' — ' + e.description : ''};-${e.amount.toFixed(2)}`
    ),
    ';;',
    `;;Einnahmen gesamt;${totalIncome.toFixed(2)}`,
    `;;Ausgaben gesamt;-${totalExpenses.toFixed(2)}`,
    `;;Saldo;${saldo.toFixed(2)}`,
  ]
  const csv = rows.join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Kassenbuch-${monthName}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadPdf() {
  const { filteredSales, filteredExpenses, totalIncome, totalExpenses, saldo } = getExportData()
  const monthName = new Date(exportYear, exportMonth - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text(`Kassenbuch — ${monthName}`, 14, 18)

  doc.setFontSize(11)
  doc.text('Einnahmen', 14, 30)
  autoTable(doc, {
    startY: 33,
    head: [['Datum', 'Beschreibung', 'Betrag']],
    body: filteredSales.map(s => [
      new Date(s.date).toLocaleDateString('de-DE'),
      s.notes ?? s.customerName ?? 'Direktverkauf',
      `${s.total.toFixed(2)} €`,
    ]),
    foot: [['', 'Gesamt', `${totalIncome.toFixed(2)} €`]],
    theme: 'striped',
    headStyles: { fillColor: [251, 191, 36] },
  })

  const afterSales = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(11)
  doc.text('Ausgaben', 14, afterSales)
  autoTable(doc, {
    startY: afterSales + 3,
    head: [['Datum', 'Kategorie', 'Beschreibung', 'Betrag']],
    body: filteredExpenses.map(e => [
      new Date(e.date).toLocaleDateString('de-DE'),
      e.category,
      e.description ?? '',
      `${e.amount.toFixed(2)} €`,
    ]),
    foot: [['', '', 'Gesamt', `${totalExpenses.toFixed(2)} €`]],
    theme: 'striped',
    headStyles: { fillColor: [244, 63, 94] },
  })

  const afterExp = (doc as any).lastAutoTable.finalY + 10
  autoTable(doc, {
    startY: afterExp,
    body: [
      ['Einnahmen', `${totalIncome.toFixed(2)} €`],
      ['Ausgaben', `-${totalExpenses.toFixed(2)} €`],
      ['Saldo', `${saldo.toFixed(2)} €`],
    ],
    theme: 'plain',
    styles: { fontStyle: 'bold' },
  })

  doc.save(`Kassenbuch-${monthName}.pdf`)
}
```

- [ ] **Schritt 7: Stats-Karte Ausgaben + Export-Button im Header**

Füge im Stats-Bereich (nach der Kommission-Karte, `grid grid-cols-3`) eine vierte Karte ein und ändere das Grid auf `grid-cols-2 md:grid-cols-4`:

Ersetze:
```tsx
<div className="grid grid-cols-3 gap-3 mb-6">
```
durch:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
```

Füge nach der Kommission-Karte ein:
```tsx
<div className="bg-white rounded-2xl shadow-sm p-4">
  <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Ausgaben (Monat)</p>
  <p className="text-xl font-semibold text-zinc-900">{fmt(expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth() && new Date(e.date).getFullYear() === new Date().getFullYear()).reduce((s, e) => s + e.amount, 0))}</p>
</div>
```

Füge im Header (nach `<p className="text-zinc-500 ...">Honigverkauf & Kommission</p>`) einen Export-Button ein:
```tsx
<button onClick={() => setShowExport(true)}
  className="flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-medium transition-colors">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  Export
</button>
```

Dazu muss das Header-Div ein `flex items-start justify-between` bekommen.

- [ ] **Schritt 8: Tab-Leiste um Ausgaben erweitern**

Ersetze:
```tsx
{(['verkauf', 'kommission', 'artikel'] as Tab[]).map(t => (
  ...
  {t === 'verkauf' ? 'Verkäufe' : t === 'kommission' ? 'Kommission' : 'Artikel'}
```
durch:
```tsx
{(['verkauf', 'kommission', 'artikel', 'ausgaben'] as Tab[]).map(t => (
  ...
  {t === 'verkauf' ? 'Verkäufe' : t === 'kommission' ? 'Kommission' : t === 'artikel' ? 'Artikel' : 'Ausgaben'}
```

- [ ] **Schritt 9: Ausgaben-Tab-Inhalt hinzufügen**

Nach dem `{tab === 'artikel' && (...)}` Block füge ein:

```tsx
{/* AUSGABEN */}
{tab === 'ausgaben' && (
  <div>
    <div className="flex justify-end mb-4">
      <button onClick={() => setShowExpense(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ausgabe erfassen
      </button>
    </div>

    {showExpense && (
      <form onSubmit={saveExpense} className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
        <p className="text-[14px] font-semibold text-zinc-900">Neue Ausgabe</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Datum</label>
            <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-1">Betrag (€)</label>
            <input type="number" step="0.01" min="0.01" value={expAmount} onChange={e => setExpAmount(e.target.value)} required placeholder="0.00"
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-zinc-500 mb-1">Kategorie</label>
          <select value={expCategory} onChange={e => setExpCategory(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
            {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-zinc-500 mb-1">Beschreibung (optional)</label>
          <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="z.B. Bienenwachs, 2kg"
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={savingExp}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2 text-[13px] font-semibold transition-colors">
            {savingExp ? 'Wird gespeichert…' : 'Speichern'}
          </button>
          <button type="button" onClick={() => setShowExpense(false)}
            className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">
            Abbrechen
          </button>
        </div>
      </form>
    )}

    {expenses.length === 0 ? (
      <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
        <p className="text-[15px] font-medium text-zinc-900">Noch keine Ausgaben</p>
        <p className="text-[13px] text-zinc-400 mt-1">Erfasse deine erste Ausgabe</p>
      </div>
    ) : (
      <div className="space-y-2">
        {expenses.map(exp => (
          <div key={exp.id} className="bg-white rounded-2xl shadow-sm px-5 py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{exp.category}</span>
                {exp.description && <span className="text-[13px] text-zinc-700">{exp.description}</span>}
              </div>
              <p className="text-[12px] text-zinc-400 mt-0.5">{fmtDate(exp.date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[15px] font-semibold text-rose-600">−{fmt(exp.amount)}</p>
              <button onClick={() => deleteExpense(exp.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
        ))}
        <div className="bg-zinc-50 rounded-2xl px-5 py-3 flex justify-between items-center">
          <span className="text-[13px] font-medium text-zinc-500">Gesamt</span>
          <span className="text-[15px] font-semibold text-rose-600">−{fmt(expenses.reduce((s, e) => s + e.amount, 0))}</span>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Schritt 10: Export-Modal hinzufügen**

Ganz am Ende des JSX (vor dem letzten `</div>` der return-Anweisung) füge ein:

```tsx
{/* Export-Modal */}
{showExport && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-zinc-900">Kassenbuch exportieren</h2>
        <button onClick={() => setShowExport(false)}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-[12px] font-medium text-zinc-500 mb-1">Monat</label>
          <select value={exportMonth} onChange={e => setExportMonth(Number(e.target.value))}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('de-DE', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-zinc-500 mb-1">Jahr</label>
          <select value={exportYear} onChange={e => setExportYear(Number(e.target.value))}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
            {[exportYear - 1, exportYear, exportYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={downloadCsv}
          className="flex-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl py-2.5 text-[13px] font-medium transition-colors">
          CSV
        </button>
        <button onClick={downloadPdf}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors">
          PDF
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Schritt 11: TypeScript-Check**

```bash
npx tsc --noEmit
```

Erwartetes Ergebnis: keine Fehler.

- [ ] **Schritt 12: Commit**

```bash
git add src/app/dashboard/kassenbuch/page.tsx package.json package-lock.json
git commit -m "feat: Kassenbuch — Ausgaben-Tab, Export-Modal (PDF/CSV), Stats-Erweiterung"
```

---

## Manuelle Verifikation

1. **Auto-Sale:** Kommission anlegen mit Mengen → Einzelne Mengen als `soldQuantity` eintragen → Status auf "Abgerechnet" setzen → Tab "Verkäufe" öffnen → neuer Sale-Eintrag erscheint mit korrekter Summe
2. **Ausgaben:** Tab "Ausgaben" öffnen → "Ausgabe erfassen" → Formular ausfüllen → gespeichert → erscheint in Liste mit korrekter Summe → Löschen funktioniert
3. **CSV:** Export-Button → Monat/Jahr wählen → CSV → in Excel öffnen → Einnahmen/Ausgaben/Saldo korrekt
4. **PDF:** Export-Button → Monat/Jahr wählen → PDF → öffnet → Tabellen mit Einnahmen, Ausgaben, Zusammenfassung sichtbar
