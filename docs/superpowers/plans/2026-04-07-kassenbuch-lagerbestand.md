# Kassenbuch Lagerbestand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produkt-Katalog um Füllmenge (fillAmount/fillUnit) und Lagerbestand (stockQuantity) erweitern, Einbuchen-Flow im Artikel-Tab, Lagerprüfung beim Verkauf, und neues Kommissions-Abrechnungsmodal mit Mengenangabe.

**Architecture:** Prisma-Schema wird um drei Felder auf `Product` erweitert. Neuer API-Endpunkt `POST /api/kassenbuch/products/[id]/stock` für Einbuchungen. `POST /api/kassenbuch/sales` prüft Lagerbestand via Prisma-Transaktion. `PATCH /api/kassenbuch/consignments/[id]` bucht beim Abrechnen vom Lager ab. Das Frontend (`page.tsx`) bekommt neue UI-Elemente für alle drei Flows.

**Tech Stack:** Next.js 15 App Router, Prisma (PostgreSQL), TypeScript, Tailwind CSS, Jest + React Testing Library

---

## File Map

| Action | File |
|---|---|
| Modify schema | `prisma/schema.prisma` |
| Create migration | `prisma/migrations/` (auto-generated) |
| Create stock API | `src/app/api/kassenbuch/products/[id]/stock/route.ts` |
| Modify products PUT | `src/app/api/kassenbuch/products/[id]/route.ts` |
| Modify products POST | `src/app/api/kassenbuch/products/route.ts` |
| Modify sales POST | `src/app/api/kassenbuch/sales/route.ts` |
| Modify consignments PATCH | `src/app/api/kassenbuch/consignments/[id]/route.ts` |
| Modify frontend | `src/app/dashboard/kassenbuch/page.tsx` |
| Create API tests | `src/__tests__/api/kassenbuch-stock.test.ts` |
| Create UI tests | `src/__tests__/components/KassenbuchStock.test.tsx` |

---

### Task 1: Prisma Schema erweitern + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Schema ändern**

In `prisma/schema.prisma`, das `Product`-Model um drei Felder erweitern. Suche nach `model Product {` und füge die drei neuen Felder nach `description String?` ein:

```prisma
model Product {
  id               String            @id @default(cuid())
  name             String
  unit             String            @default("Stück")
  price            Float
  description      String?
  fillAmount       Float?
  fillUnit         String?
  stockQuantity    Int               @default(0)
  userId           String
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  saleItems        SaleItem[]
  consignmentItems ConsignmentItem[]
  createdAt        DateTime          @default(now())
}
```

- [ ] **Step 2: Migration erstellen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx prisma migrate dev --name add-product-stock
```

Expected: Migration erfolgreich, neue Felder in DB vorhanden. Bestehende Produkte erhalten `stockQuantity = 0`, `fillAmount = null`, `fillUnit = null`.

- [ ] **Step 3: Prisma Client generieren**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: TypeScript prüfen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 5: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add prisma/schema.prisma prisma/migrations/ && git commit -m "feat: add fillAmount, fillUnit, stockQuantity to Product model"
```

---

### Task 2: Stock-Einbuchen API

**Files:**
- Create: `src/app/api/kassenbuch/products/[id]/stock/route.ts`

- [ ] **Step 1: Datei erstellen**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { quantity } = await req.json()

  if (!quantity || typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
    return NextResponse.json({ error: 'Menge muss eine positive ganze Zahl sein' }, { status: 400 })
  }

  const product = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!product) return NextResponse.json({ error: 'Artikel nicht gefunden' }, { status: 404 })

  const updated = await prisma.product.update({
    where: { id },
    data: { stockQuantity: { increment: quantity } },
  })

  return NextResponse.json({ stockQuantity: updated.stockQuantity })
}
```

- [ ] **Step 2: TypeScript prüfen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 3: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/app/api/kassenbuch/products/[id]/stock/route.ts && git commit -m "feat: add stock booking endpoint POST /api/kassenbuch/products/[id]/stock"
```

---

### Task 3: Products API — fillAmount/fillUnit + Löschen-Schutz

**Files:**
- Modify: `src/app/api/kassenbuch/products/route.ts`
- Modify: `src/app/api/kassenbuch/products/[id]/route.ts`

- [ ] **Step 1: POST in `products/route.ts` erweitern**

Die `POST`-Funktion nimmt jetzt auch `fillAmount` und `fillUnit` entgegen. Ersetze die gesamte POST-Funktion:

```ts
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, unit, price, description, fillAmount, fillUnit } = await req.json()
  if (!name || price == null) return NextResponse.json({ error: 'Name und Preis fehlen' }, { status: 400 })
  const product = await prisma.product.create({
    data: {
      name,
      unit: unit || 'Stück',
      price: parseFloat(price),
      description: description || null,
      fillAmount: fillAmount ? parseFloat(fillAmount) : null,
      fillUnit: fillUnit || null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(product, { status: 201 })
}
```

- [ ] **Step 2: PUT in `products/[id]/route.ts` erweitern**

Ersetze die gesamte PUT-Funktion (inkl. `fillAmount`/`fillUnit`, kein `stockQuantity` über PUT):

```ts
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { name, unit, price, description, fillAmount, fillUnit } = await req.json()
  const product = await prisma.product.findFirst({ where: { id, userId: session.user.id } })
  if (!product) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const updated = await prisma.product.update({
    where: { id },
    data: {
      name,
      unit,
      price: parseFloat(price),
      description: description || null,
      fillAmount: fillAmount ? parseFloat(fillAmount) : null,
      fillUnit: fillUnit || null,
    },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 3: DELETE in `products/[id]/route.ts` — Schutz bei Lagerbestand > 0**

Ersetze die DELETE-Funktion:

```ts
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const product = await prisma.product.findFirst({ where: { id, userId: session.user.id } })
  if (!product) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (product.stockQuantity > 0) {
    return NextResponse.json(
      { error: 'Artikel hat noch Lagerbestand. Bitte erst auf 0 reduzieren.' },
      { status: 409 }
    )
  }
  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: TypeScript prüfen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 5: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/app/api/kassenbuch/products/route.ts src/app/api/kassenbuch/products/[id]/route.ts && git commit -m "feat: products API supports fillAmount/fillUnit, delete blocked when stock > 0"
```

---

### Task 4: Sales API — Lagerprüfung + atomarer Lagerabzug

**Files:**
- Modify: `src/app/api/kassenbuch/sales/route.ts`

- [ ] **Step 1: POST-Funktion ersetzen**

Ersetze die gesamte `POST`-Funktion in `src/app/api/kassenbuch/sales/route.ts`:

```ts
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { customerName, customerId, date, notes, items } = await req.json()
  if (!items || items.length === 0) return NextResponse.json({ error: 'Keine Positionen' }, { status: 400 })

  // Lagerprüfung
  const productIds = items.map((i: { productId: string }) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, userId: session.user.id },
  })

  const stockErrors: { productId: string; productName: string; requested: number; available: number }[] = []
  for (const item of items as { productId: string; quantity: number; price: number }[]) {
    const product = products.find(p => p.id === item.productId)
    if (!product) continue
    if (item.quantity > product.stockQuantity) {
      stockErrors.push({
        productId: product.id,
        productName: product.name,
        requested: item.quantity,
        available: product.stockQuantity,
      })
    }
  }

  if (stockErrors.length > 0) {
    return NextResponse.json({ error: 'insufficient_stock', items: stockErrors }, { status: 409 })
  }

  // Atomare Transaktion: Sale erstellen + Lager abziehen
  const total = (items as { quantity: number; price: number }[]).reduce((sum, i) => sum + i.quantity * i.price, 0)

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        customerName: customerName || null,
        customerId: customerId || null,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
        total,
        userId: session.user.id,
        items: {
          create: (items as { productId: string; quantity: number; price: number }[]).map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            total: i.quantity * i.price,
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    })

    for (const item of items as { productId: string; quantity: number }[]) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      })
    }

    return created
  })

  return NextResponse.json(sale, { status: 201 })
}
```

- [ ] **Step 2: TypeScript prüfen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 3: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/app/api/kassenbuch/sales/route.ts && git commit -m "feat: sales API checks stock availability and deducts atomically"
```

---

### Task 5: Consignments API — Lagerabzug beim Abrechnen

**Files:**
- Modify: `src/app/api/kassenbuch/consignments/[id]/route.ts`

- [ ] **Step 1: PATCH-Funktion erweitern**

Ersetze die gesamte `PATCH`-Funktion in `src/app/api/kassenbuch/consignments/[id]/route.ts`:

```ts
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

  // Beim Abrechnen: Lagerprüfung für soldQuantity
  if (status === 'settled' && consignment.status !== 'settled') {
    const itemsToSettle = items as { id: string; soldQuantity?: number; returnedQuantity?: number }[] | undefined
    const stockErrors: { productId: string; productName: string; requested: number; available: number }[] = []

    for (const ci of consignment.items) {
      const update = itemsToSettle?.find(i => i.id === ci.id)
      const soldQty = update?.soldQuantity ?? ci.soldQuantity
      if (soldQty > ci.product.stockQuantity) {
        stockErrors.push({
          productId: ci.productId,
          productName: ci.product.name,
          requested: soldQty,
          available: ci.product.stockQuantity,
        })
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ error: 'insufficient_stock', items: stockErrors }, { status: 409 })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const cons = await tx.consignment.update({
      where: { id },
      data: {
        status: status ?? consignment.status,
        ...(items && {
          items: {
            updateMany: (items as { id: string; soldQuantity?: number; returnedQuantity?: number }[]).map(i => ({
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

    // Auto-Sale + Lagerabzug beim Abrechnen
    if (status === 'settled' && consignment.status !== 'settled') {
      const soldItems = cons.items.filter(i => i.soldQuantity > 0)
      if (soldItems.length > 0) {
        const total = soldItems.reduce((sum, i) => sum + i.soldQuantity * i.price, 0)
        await tx.sale.create({
          data: {
            userId: session.user.id,
            date: new Date(),
            customerName: cons.locationName,
            customerId: cons.customerId,
            notes: `Via Kommission: ${cons.locationName ?? ''}`.trim().replace(/:\s*$/, ''),
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

        for (const i of soldItems) {
          await tx.product.update({
            where: { id: i.productId },
            data: { stockQuantity: { decrement: i.soldQuantity } },
          })
        }
      }
    }

    return cons
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 2: TypeScript prüfen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 3: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/app/api/kassenbuch/consignments/[id]/route.ts && git commit -m "feat: consignment settlement deducts stock atomically with 409 guard"
```

---

### Task 6: API Tests

**Files:**
- Create: `src/__tests__/api/kassenbuch-stock.test.ts`

- [ ] **Step 1: Testdatei erstellen**

```bash
mkdir -p "C:/Users/koerbe/PycharmProjects/Bee/src/__tests__/api"
```

- [ ] **Step 2: Tests schreiben**

```ts
// src/__tests__/api/kassenbuch-stock.test.ts
import { NextRequest } from 'next/server'

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))
import { getServerSession } from 'next-auth/next'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    sale: { create: jest.fn() },
    consignment: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}))
import { prisma } from '@/lib/prisma'

const SESSION = { user: { id: 'user-1' } }
const mockSession = getServerSession as jest.Mock
const mockProduct = prisma.product as jest.Mocked<typeof prisma.product>
const mockSale = prisma.sale as jest.Mocked<typeof prisma.sale>
const mockTx = prisma.$transaction as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(SESSION)
})

function makeReq(body: unknown, method = 'POST') {
  return new NextRequest('http://localhost', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Stock endpoint ────────────────────────────────────────────────
describe('POST /api/kassenbuch/products/[id]/stock', () => {
  const { POST } = require('@/app/api/kassenbuch/products/[id]/stock/route')

  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ quantity: 5 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 for non-positive quantity', async () => {
    const res = await POST(makeReq({ quantity: 0 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-integer quantity', async () => {
    const res = await POST(makeReq({ quantity: 1.5 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when product not found', async () => {
    mockProduct.findFirst.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ quantity: 5 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(404)
  })

  it('increments stockQuantity and returns new value', async () => {
    mockProduct.findFirst.mockResolvedValueOnce({ id: 'p-1', stockQuantity: 10 })
    mockProduct.update.mockResolvedValueOnce({ id: 'p-1', stockQuantity: 15 })
    const res = await POST(makeReq({ quantity: 5 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stockQuantity).toBe(15)
    expect(mockProduct.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { stockQuantity: { increment: 5 } },
    })
  })
})

// ── Sales stock check ─────────────────────────────────────────────
describe('POST /api/kassenbuch/sales — stock check', () => {
  const { POST } = require('@/app/api/kassenbuch/sales/route')

  it('returns 409 with insufficient_stock when quantity exceeds stock', async () => {
    mockProduct.findMany.mockResolvedValueOnce([
      { id: 'p-1', name: 'Honig 500g', stockQuantity: 2 },
    ])
    const res = await POST(makeReq({
      items: [{ productId: 'p-1', quantity: 5, price: 8.5 }],
    }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('insufficient_stock')
    expect(body.items[0].productId).toBe('p-1')
    expect(body.items[0].requested).toBe(5)
    expect(body.items[0].available).toBe(2)
  })

  it('creates sale and deducts stock when stock is sufficient', async () => {
    mockProduct.findMany.mockResolvedValueOnce([
      { id: 'p-1', name: 'Honig 500g', stockQuantity: 10 },
    ])
    const fakeSale = { id: 's-1', total: 42.5, items: [], customer: null }
    mockTx.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma as any))
    mockSale.create.mockResolvedValueOnce(fakeSale)
    mockProduct.update.mockResolvedValue({ id: 'p-1', stockQuantity: 5 })

    const res = await POST(makeReq({
      items: [{ productId: 'p-1', quantity: 5, price: 8.5 }],
      customerName: 'Max',
    }))
    expect(res.status).toBe(201)
    expect(mockProduct.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { stockQuantity: { decrement: 5 } },
    })
  })
})

// ── Product delete guard ──────────────────────────────────────────
describe('DELETE /api/kassenbuch/products/[id] — stock guard', () => {
  const { DELETE } = require('@/app/api/kassenbuch/products/[id]/route')

  it('returns 409 when stockQuantity > 0', async () => {
    mockProduct.findFirst.mockResolvedValueOnce({ id: 'p-1', stockQuantity: 5 })
    const res = await DELETE(makeReq({}), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(409)
  })

  it('deletes when stockQuantity === 0', async () => {
    mockProduct.findFirst.mockResolvedValueOnce({ id: 'p-1', stockQuantity: 0 })
    ;(prisma.product.delete as jest.Mock).mockResolvedValueOnce({ id: 'p-1' })
    const res = await DELETE(makeReq({}), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 3: Tests laufen lassen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx jest src/__tests__/api/kassenbuch-stock.test.ts --no-coverage
```

Expected: alle Tests grün. Wenn Tests fehlschlagen: Fehlermeldung lesen, Test-Setup oder Mocks anpassen (NICHT die API-Routes ändern).

- [ ] **Step 4: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/__tests__/api/kassenbuch-stock.test.ts && git commit -m "test: API tests for stock booking, sales stock check, delete guard"
```

---

### Task 7: Frontend — Typen + Artikel-Tab UI

**Files:**
- Modify: `src/app/dashboard/kassenbuch/page.tsx`

Dieser Task betrifft **nur die ersten ~70 Zeilen** (Typen) und den **Artikel-Tab** (Zeilen ~478–516). Andere Teile der Datei werden in späteren Tasks geändert.

- [ ] **Step 1: Product-Interface erweitern**

In `page.tsx`, das `Product`-Interface (Zeile 7) ersetzen:

```ts
interface Product { id: string; name: string; unit: string; price: number; description: string | null; fillAmount: number | null; fillUnit: string | null; stockQuantity: number }
```

- [ ] **Step 2: Neuen State für Einbuchen hinzufügen**

Nach dem bestehenden State für das Product-Formular (nach `const [savingProd, setSavingProd] = useState(false)`, ca. Zeile 68) einfügen:

```ts
  // Einbuchen
  const [stockProductId, setStockProductId] = useState<string | null>(null)
  const [stockAmount, setStockAmount] = useState(1)
  const [savingStock, setSavingStock] = useState(false)
```

- [ ] **Step 3: Neuen State für Product-Bearbeitung hinzufügen**

Nach dem Einbuchen-State einfügen:

```ts
  // Produkt bearbeiten
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editFillAmount, setEditFillAmount] = useState('')
  const [editFillUnit, setEditFillUnit] = useState('g')
```

- [ ] **Step 4: `saveProduct` um fillAmount/fillUnit erweitern**

Die bestehende `saveProduct`-Funktion (ca. Zeile 159) ersetzen:

```ts
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setSavingProd(true)
    await fetch('/api/kassenbuch/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: prodName,
        unit: prodUnit,
        price: parseFloat(prodPrice),
        description: prodDesc,
        fillAmount: editFillAmount ? parseFloat(editFillAmount) : null,
        fillUnit: editFillAmount ? editFillUnit : null,
      }),
    })
    setSavingProd(false)
    setShowProduct(false)
    setProdName(''); setProdPrice(''); setProdDesc(''); setEditFillAmount(''); setEditFillUnit('g')
    load()
  }
```

- [ ] **Step 5: `stockIn`-Funktion hinzufügen**

Nach `deleteProduct` (ca. Zeile 177) einfügen:

```ts
  async function stockIn(productId: string) {
    setSavingStock(true)
    await fetch(`/api/kassenbuch/products/${productId}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: stockAmount }),
    })
    setSavingStock(false)
    setStockProductId(null)
    setStockAmount(1)
    load()
  }
```

- [ ] **Step 6: Artikel-Tab UI ersetzen**

Den gesamten Block `{tab === 'artikel' && (` (ca. Zeilen 479–516) ersetzen:

```tsx
      {/* ARTIKEL */}
      {tab === 'artikel' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowProduct(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Artikel anlegen
            </button>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
              <p className="text-[15px] font-medium text-zinc-900">Noch keine Artikel</p>
              <p className="text-[13px] text-zinc-400 mt-1">Leg zuerst deine Produkte an (z.B. Blütenhonig 500g)</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(p => {
                const stockColor = p.stockQuantity === 0
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : p.stockQuantity <= 5
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                const isExpanded = stockProductId === p.id
                return (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-zinc-900">{p.name}</p>
                        <p className="text-[12px] text-zinc-400">
                          {p.fillAmount && p.fillUnit ? `${p.fillAmount} ${p.fillUnit} · ` : ''}{fmt(p.price)}
                          {p.description ? ` · ${p.description}` : ''}
                        </p>
                      </div>
                      <div className={`border rounded-xl px-3 py-2 text-center min-w-[64px] ${stockColor}`}>
                        <p className="text-[18px] font-bold leading-none">{p.stockQuantity}</p>
                        <p className="text-[10px] font-medium mt-0.5">im Lager</p>
                      </div>
                    </div>
                    <div className="px-5 pb-4 flex gap-2">
                      <button
                        onClick={() => { setStockProductId(isExpanded ? null : p.id); setStockAmount(1) }}
                        className="flex-1 text-[12px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg py-2 transition-colors"
                      >
                        + Einbuchen
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="text-[12px] text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-3 py-2 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-green-100 bg-green-50 px-5 py-4">
                        <p className="text-[12px] font-semibold text-green-800 mb-3">Einbuchen: {p.name}</p>
                        <div className="flex items-center gap-4 mb-3">
                          <button type="button"
                            onClick={() => setStockAmount(a => Math.max(1, a - 1))}
                            className="w-10 h-10 bg-white border border-green-200 rounded-xl text-zinc-700 text-xl font-light hover:bg-green-100 transition-colors">
                            −
                          </button>
                          <div className="text-center min-w-[48px]">
                            <p className="text-2xl font-bold text-zinc-900">{stockAmount}</p>
                          </div>
                          <button type="button"
                            onClick={() => setStockAmount(a => a + 1)}
                            className="w-10 h-10 bg-white border border-green-200 rounded-xl text-zinc-700 text-xl font-light hover:bg-green-100 transition-colors">
                            +
                          </button>
                          <p className="text-[12px] text-zinc-500">→ Neuer Bestand: <span className="font-bold text-green-700">{p.stockQuantity + stockAmount}</span></p>
                        </div>
                        <button
                          onClick={() => stockIn(p.id)}
                          disabled={savingStock}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors"
                        >
                          {savingStock ? 'Wird eingebucht…' : 'Einbuchen bestätigen'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 7: TypeScript prüfen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 8: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/app/dashboard/kassenbuch/page.tsx && git commit -m "feat: Artikel-Tab mit Lagerbestand-Badge und Einbuchen-Flow"
```

---

### Task 8: Frontend — Verkauf mit Lagerprüfung

**Files:**
- Modify: `src/app/dashboard/kassenbuch/page.tsx`

- [ ] **Step 1: `saleStockError`-State hinzufügen**

Nach `const [savingSale, setSavingSale] = useState(false)` (ca. Zeile 52) einfügen:

```ts
  const [saleStockError, setSaleStockError] = useState<{ productName: string; requested: number; available: number }[]>([])
```

- [ ] **Step 2: `saveSale` mit Lagerprüfung ersetzen**

Die bestehende `saveSale`-Funktion (ca. Zeile 110) ersetzen:

```ts
  async function saveSale(e: React.FormEvent) {
    e.preventDefault()
    setSavingSale(true)
    setSaleStockError([])
    const res = await fetch('/api/kassenbuch/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: saleCustomer, date: saleDate, notes: saleNotes, items: saleItems }),
    })
    setSavingSale(false)
    if (res.status === 409) {
      const body = await res.json()
      setSaleStockError(body.items ?? [])
      return
    }
    setShowSale(false)
    setSaleStockError([])
    setSaleCustomer(''); setSaleNotes(''); setSaleItems([{ productId: '', quantity: 1, price: 0 }])
    load()
  }
```

- [ ] **Step 3: Lagerindikator pro Zeile im Verkaufs-Modal hinzufügen**

Im Verkaufs-Modal, nach dem bestehenden Positions-Block (nach dem `<div key={i} className="grid grid-cols-12 gap-2 items-center">` Block, direkt vor dem schließenden `</div>` der `saleItems.map`), einen Lagerindikator je Artikel einfügen.

Suche im Verkaufs-Modal nach diesem Muster (ca. Zeile 649):
```tsx
                      className="col-span-3 border border-zinc-200 rounded-lg px-2 py-2 text-[12px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <span className="col-span-1 text-[11px] text-zinc-500 text-right">{fmt(item.quantity * item.price)}</span>
```

Direkt danach (noch innerhalb des `saleItems.map`-Blocks, aber nach den Grid-Inputs) füge ein:

```tsx
                      {item.productId && (() => {
                        const prod = products.find(p => p.id === item.productId)
                        if (!prod) return null
                        const ok = item.quantity <= prod.stockQuantity
                        return (
                          <div className={`col-span-12 flex items-center gap-1.5 mt-1 ${ok ? 'text-green-600' : 'text-rose-600'}`}>
                            <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-rose-500'}`} />
                            <span className="text-[11px] font-medium">
                              {ok
                                ? `Lager: ${prod.stockQuantity} verfügbar`
                                : `Nur ${prod.stockQuantity} im Lager`}
                            </span>
                          </div>
                        )
                      })()}
```

- [ ] **Step 4: Fehlermeldung + blockierten Button im Modal hinzufügen**

Im Verkaufs-Modal, den bestehenden Submit-Button (ca. Zeile 664) suchen:
```tsx
              <button type="submit" disabled={savingSale}
```

Direkt **vor** diesem Button einfügen:
```tsx
              {saleStockError.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {saleStockError.map(e => (
                    <p key={e.productName} className="text-[12px] text-rose-700 font-medium">
                      ⚠ {e.productName}: nur {e.available} im Lager, {e.requested} angefragt
                    </p>
                  ))}
                </div>
              )}
```

Den Submit-Button selbst so erweitern, dass er bei Lagerfehlern blockiert ist:
```tsx
              <button type="submit" disabled={savingSale || saleItems.some(item => {
                const prod = products.find(p => p.id === item.productId)
                return prod ? item.quantity > prod.stockQuantity : false
              })}
```

- [ ] **Step 5: TypeScript prüfen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 6: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/app/dashboard/kassenbuch/page.tsx && git commit -m "feat: Verkauf blockiert bei unzureichendem Lagerbestand"
```

---

### Task 9: Frontend — Neues Artikel-Formular (fillAmount/fillUnit)

**Files:**
- Modify: `src/app/dashboard/kassenbuch/page.tsx`

- [ ] **Step 1: Neues State für fillAmount im Formular**

Am Anfang des Product-Form-States (nach `const [prodDesc, setProdDesc] = useState('')`) einfügen:

```ts
  const [prodFillAmount, setProdFillAmount] = useState('')
  const [prodFillUnit, setProdFillUnit] = useState('g')
```

- [ ] **Step 2: `saveProduct` korrigieren**

Die `saveProduct`-Funktion aus Task 7 referenziert `editFillAmount` und `editFillUnit`. Diese Namen ändern zu `prodFillAmount` und `prodFillUnit`. Die Funktion soll so aussehen:

```ts
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setSavingProd(true)
    await fetch('/api/kassenbuch/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: prodName,
        unit: prodUnit,
        price: parseFloat(prodPrice),
        description: prodDesc,
        fillAmount: prodFillAmount ? parseFloat(prodFillAmount) : null,
        fillUnit: prodFillAmount ? prodFillUnit : null,
      }),
    })
    setSavingProd(false)
    setShowProduct(false)
    setProdName(''); setProdPrice(''); setProdDesc(''); setProdFillAmount(''); setProdFillUnit('g')
    load()
  }
```

- [ ] **Step 3: Artikel-Modal um Füllmengen-Felder erweitern**

Das Modal `{showProduct && (` suchen. Nach den bestehenden Feldern für Name und Einheit (Zeilen ca. 705–730), aber **vor** dem Preis-Feld, zwei neue Felder einfügen:

```tsx
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Füllmenge (optional)</label>
                  <input type="number" min="0" step="any" value={prodFillAmount} onChange={e => setProdFillAmount(e.target.value)}
                    placeholder="z.B. 500"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Einheit</label>
                  <select value={prodFillUnit} onChange={e => setProdFillUnit(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
```

- [ ] **Step 4: TypeScript prüfen + Tests laufen lassen**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit && npx jest --no-coverage
```

Expected: zero TypeScript errors, alle Tests grün

- [ ] **Step 5: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/app/dashboard/kassenbuch/page.tsx && git commit -m "feat: Artikel-Formular mit Füllmenge und Einheit"
```

---

### Task 10: Frontend — Kommissions-Abrechnungsmodal

**Files:**
- Modify: `src/app/dashboard/kassenbuch/page.tsx`

- [ ] **Step 1: State für Abrechungs-Modal hinzufügen**

Nach dem `savingCons`-State einfügen:

```ts
  const [settleConsignment, setSettleConsignment] = useState<Consignment | null>(null)
  const [settleSoldQtys, setSettleSoldQtys] = useState<Record<string, number>>({})
  const [settlingCons, setSettlingCons] = useState(false)
  const [settleStockError, setSettleStockError] = useState<{ productName: string; requested: number; available: number }[]>([])
```

- [ ] **Step 2: `openSettle`-Funktion hinzufügen**

Nach `deleteConsignment` einfügen:

```ts
  function openSettle(c: Consignment) {
    const initial: Record<string, number> = {}
    c.items.forEach(item => { initial[item.id] = item.soldQuantity })
    setSettleSoldQtys(initial)
    setSettleStockError([])
    setSettleConsignment(c)
  }

  async function confirmSettle() {
    if (!settleConsignment) return
    setSettlingCons(true)
    setSettleStockError([])
    const items = settleConsignment.items.map(item => ({
      id: item.id,
      soldQuantity: settleSoldQtys[item.id] ?? 0,
      returnedQuantity: item.quantity - (settleSoldQtys[item.id] ?? 0),
    }))
    const res = await fetch(`/api/kassenbuch/consignments/${settleConsignment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'settled', items }),
    })
    setSettlingCons(false)
    if (res.status === 409) {
      const body = await res.json()
      setSettleStockError(body.items ?? [])
      return
    }
    setSettleConsignment(null)
    load()
  }
```

- [ ] **Step 3: Bestehenden "Abgerechnet"-Button durch "Abrechnen"-Button ersetzen**

Im Kommissions-Tab, den bestehenden Button:
```tsx
                            <button onClick={() => updateConsignmentStatus(c.id, 'settled')}
                              className="text-[12px] font-medium text-green-600 hover:text-green-700 px-3 py-1 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                              Abgerechnet
                            </button>
```

Ersetzen durch:
```tsx
                            <button onClick={() => openSettle(c)}
                              className="text-[12px] font-medium text-green-600 hover:text-green-700 px-3 py-1 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                              Abrechnen
                            </button>
```

- [ ] **Step 4: Abrechnungs-Modal hinzufügen**

Am Ende der return-Anweisung, nach dem letzten bestehenden Modal (vor dem schließenden `</div>` der gesamten Page), einfügen:

```tsx
      {/* Modal: Kommission abrechnen */}
      {settleConsignment && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Kommission abrechnen</h2>
                <p className="text-[12px] text-zinc-400 mt-0.5">{settleConsignment.locationName}</p>
              </div>
              <button onClick={() => setSettleConsignment(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {settleConsignment.items.map(item => {
                const sold = settleSoldQtys[item.id] ?? 0
                const prod = products.find(p => p.id === item.product.id)
                const stockOk = !prod || sold <= prod.stockQuantity
                return (
                  <div key={item.id} className={`rounded-xl border p-4 ${stockOk ? 'border-zinc-200' : 'border-rose-200 bg-rose-50'}`}>
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-900">{item.product.name}</p>
                        <p className="text-[11px] text-zinc-400">Platziert: {item.quantity} · {fmt(item.price)}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-green-700">{fmt(sold * item.price)}</p>
                    </div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase mb-2">Wie viele verkauft?</p>
                    <div className="flex items-center gap-3">
                      <button type="button"
                        onClick={() => setSettleSoldQtys(q => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - 1) }))}
                        className="w-9 h-9 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-lg transition-colors">−</button>
                      <span className="text-xl font-bold text-zinc-900 min-w-[32px] text-center">{sold}</span>
                      <button type="button"
                        onClick={() => setSettleSoldQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, (q[item.id] ?? 0) + 1) }))}
                        className="w-9 h-9 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-lg transition-colors">+</button>
                      {!stockOk && prod && (
                        <span className="text-[11px] text-rose-600 font-medium">Nur {prod.stockQuantity} im Lager</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Erlös-Zusammenfassung */}
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex justify-between">
                  <p className="text-[13px] font-semibold text-zinc-700">Erlös gesamt</p>
                  <p className="text-[15px] font-bold text-green-700">
                    {fmt(settleConsignment.items.reduce((s, item) => s + (settleSoldQtys[item.id] ?? 0) * item.price, 0))}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Erstellt Verkauf + bucht Lager ab</p>
              </div>

              {settleStockError.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {settleStockError.map(e => (
                    <p key={e.productName} className="text-[12px] text-rose-700 font-medium">
                      ⚠ {e.productName}: nur {e.available} im Lager
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={confirmSettle} disabled={settlingCons}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[13px] font-semibold transition-colors">
                  {settlingCons ? 'Wird gebucht…' : 'Abrechnen & Verkauf buchen'}
                </button>
                <button onClick={() => setSettleConsignment(null)}
                  className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 5: TypeScript prüfen + alle Tests**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && npx tsc --noEmit && npx jest --no-coverage
```

Expected: zero TypeScript errors, alle Tests grün

- [ ] **Step 6: Commit**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee && git add src/app/dashboard/kassenbuch/page.tsx && git commit -m "feat: Kommissions-Abrechnungsmodal mit Mengenangabe und Lagerabzug"
```
