# Lagerkorrektur & Völker-Metadaten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two independent features: (1) stock corrections with batch/expiry tracking in Kassenbuch, (2) founded date and notes fields for colonies.

**Architecture:** 
- **Feature 1:** New `StockCorrection` Prisma model, API endpoint `POST /api/kassenbuch/products/[id]/stock-correction`, new UI tab "Lagerkorrektionen" with modal form and table
- **Feature 2:** Extend `Colony` Prisma model with `foundedAt` and `notes` fields, update PUT endpoint, extend UI in colony detail view

**Tech Stack:** Next.js, Prisma, React (client-side state), Tailwind CSS

---

## File Structure

### Feature 1: Stock Corrections
- **Database:** `prisma/schema.prisma` — new `StockCorrection` model + relation to `Product`
- **API:** `src/app/api/kassenbuch/products/[id]/stock-correction/route.ts` — POST handler
- **UI:** `src/app/dashboard/kassenbuch/page.tsx` — new tab "lagerkorrektionen", modal, table, state management

### Feature 2: Colony Metadata
- **Database:** `prisma/schema.prisma` — extend `Colony` model
- **Migration:** Automatic (Prisma)
- **API:** Existing endpoints already handle optional fields
- **UI:** Extend existing colony detail view (exact path TBD based on codebase)

---

## Feature 1: Stock Corrections

### Task 1: Add StockCorrection model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add StockCorrection model before closing of schema**

Open `prisma/schema.prisma` and add this model after the `Expense` model (around line 262):

```prisma
model StockCorrection {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity    Int
  reason      String
  batchNumber String?
  expiryDate  DateTime?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: Add relation to Product model**

Find the `Product` model (line ~162) and add this line to its fields:

```prisma
  stockCorrections StockCorrection[]
```

- [ ] **Step 3: Add relation to User model**

Find the `User` model (line ~9) and add this line to its fields:

```prisma
  stockCorrections StockCorrection[]
```

- [ ] **Step 4: Run Prisma migration**

```bash
cd C:\Users\koerbe\PycharmProjects\Bee
npx prisma migrate dev --name add_stock_corrections
```

Expected output: Migration created and applied successfully.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add StockCorrection model for inventory adjustments"
```

---

### Task 2: Create API endpoint for stock corrections

**Files:**
- Create: `src/app/api/kassenbuch/products/[id]/stock-correction/route.ts`

- [ ] **Step 1: Create route file**

Create the directory and file `src/app/api/kassenbuch/products/[id]/stock-correction/route.ts` with this content:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const { quantity, reason, batchNumber, expiryDate } = body as Record<string, unknown>

  // Validate quantity
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity === 0) {
    return NextResponse.json({ 
      error: 'Menge muss eine ganze Zahl (nicht null) sein' 
    }, { status: 400 })
  }

  // Validate reason
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ 
      error: 'Grund erforderlich' 
    }, { status: 400 })
  }

  // Validate expiryDate if provided
  if (expiryDate && typeof expiryDate !== 'string') {
    return NextResponse.json({ 
      error: 'MHD muss ein Datum sein' 
    }, { status: 400 })
  }

  // Check product exists and belongs to user
  const product = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!product) return NextResponse.json({ error: 'Artikel nicht gefunden' }, { status: 404 })

  // Create correction record
  await prisma.stockCorrection.create({
    data: {
      productId: id,
      quantity,
      reason: reason.trim(),
      batchNumber: (batchNumber && typeof batchNumber === 'string') ? batchNumber.trim() : null,
      expiryDate: expiryDate ? new Date(expiryDate as string) : null,
      userId: session.user.id,
    },
  })

  // Update product stock
  const updated = await prisma.product.update({
    where: { id },
    data: { stockQuantity: { increment: quantity } },
  })

  return NextResponse.json({ 
    stockQuantity: updated.stockQuantity,
    message: 'Korrektur erfolgreich gespeichert',
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Check product exists and belongs to user
  const product = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!product) return NextResponse.json({ error: 'Artikel nicht gefunden' }, { status: 404 })

  // Get all corrections for this product, sorted by newest first
  const corrections = await prisma.stockCorrection.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(corrections)
}
```

- [ ] **Step 2: Test the endpoint locally**

```bash
# You can test this manually by making a POST request to the endpoint
# Or skip for now and test via UI in next steps
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/kassenbuch/products/[id]/stock-correction/route.ts
git commit -m "feat: add stock correction API endpoint with batch/expiry tracking"
```

---

### Task 3: Update Kassenbuch page to add "Lagerkorrektionen" tab and UI

**Files:**
- Modify: `src/app/dashboard/kassenbuch/page.tsx`

- [ ] **Step 1: Add "lagerkorrektionen" to Tab type**

Find line 5 (`type Tab = ...`) and change it to:

```typescript
type Tab = 'verkauf' | 'kommission' | 'artikel' | 'ausgaben' | 'laeden' | 'uebersicht' | 'lagerkorrektionen'
```

- [ ] **Step 2: Add interface for StockCorrection**

After the existing interfaces (around line 13), add:

```typescript
interface StockCorrection { id: string; productId: string; quantity: number; reason: string; batchNumber: string | null; expiryDate: string | null; createdAt: string }
```

- [ ] **Step 3: Add state variables for stock corrections**

Find the state declarations (starting around line 27) and add after line 83 (after the `savingStock` line):

```typescript
  // Stock Corrections
  const [stockCorrections, setStockCorrections] = useState<StockCorrection[]>([])
  const [showStockCorrection, setShowStockCorrection] = useState(false)
  const [corrProductId, setCorrProductId] = useState<string | null>(null)
  const [corrQuantity, setCorrQuantity] = useState('')
  const [corrReason, setCorrReason] = useState('')
  const [corrBatch, setCorrBatch] = useState('')
  const [corrExpiry, setCorrExpiry] = useState('')
  const [savingCorr, setSavingCorr] = useState(false)
```

- [ ] **Step 4: Update load function to fetch stock corrections**

Find the `load` function (line ~89) and update it. Change the Promise.all to fetch corrections too. Find this line:

```typescript
  const [p, s, c, e, stores] = await Promise.all([
```

And change the entire Promise.all block to:

```typescript
  const [p, s, c, e, stores] = await Promise.all([
    fetch('/api/kassenbuch/products').then(r => r.json()),
    fetch('/api/kassenbuch/sales').then(r => r.json()),
    fetch('/api/kassenbuch/consignments').then(r => r.json()),
    fetch('/api/kassenbuch/expenses').then(r => r.json()),
    fetch('/api/kassenbuch/commission-stores').then(r => r.json()),
  ])
```

Then after `setExpenses(e)`, add:

```typescript
    setStockCorrections([])  // Will be loaded per-product when needed
```

Actually, refactor this: load corrections only when tab is "lagerkorrektionen" to avoid overhead. Instead, add a separate function:

```typescript
  const loadStockCorrections = useCallback(async () => {
    if (!products.length) return
    // Fetch all corrections for all products (we'll display them per-product)
    const allCorrections: StockCorrection[] = []
    for (const product of products) {
      try {
        const corr = await fetch(`/api/kassenbuch/products/${product.id}/stock-correction`)
          .then(r => r.json())
        allCorrections.push(...corr)
      } catch {
        // Silently skip if fetch fails
      }
    }
    setStockCorrections(allCorrections)
  }, [products])
```

And call it when tab changes to 'lagerkorrektionen'. Actually, simpler approach: load when needed. Update the main load function to not load corrections, only load them when user clicks the tab.

Revise: Keep the load simple, add a useEffect that loads corrections when tab is 'lagerkorrektionen':

After the main useEffect that calls `load()`, add:

```typescript
  useEffect(() => {
    if (tab === 'lagerkorrektionen') {
      loadStockCorrections()
    }
  }, [tab, loadStockCorrections])

  const loadStockCorrections = useCallback(async () => {
    const allCorrections: StockCorrection[] = []
    for (const product of products) {
      try {
        const corr = await fetch(`/api/kassenbuch/products/${product.id}/stock-correction`)
          .then(r => r.json())
        allCorrections.push(...corr)
      } catch {
        // Silently skip if fetch fails
      }
    }
    setStockCorrections(allCorrections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }, [products])
```

Actually let me simplify: just keep the state and function simple. Find where the useEffect for loading is, and we'll just load corrections on demand when the tab is selected.

Let me be more precise. Find the `useEffect(() => { setLoading(true); load().then(() => setLoading(false)) }, [load])` block and leave it as is.

Then, add a new useEffect after it:

```typescript
  useEffect(() => {
    if (tab === 'lagerkorrektionen') {
      loadStockCorrections()
    }
  }, [tab, loadStockCorrections])
```

And add the loadStockCorrections function definition in the same scope (before the return statement):

```typescript
  const loadStockCorrections = useCallback(async () => {
    const allCorrections: StockCorrection[] = []
    for (const product of products) {
      try {
        const corr = await fetch(`/api/kassenbuch/products/${product.id}/stock-correction`)
          .then(r => r.json())
        allCorrections.push(...(Array.isArray(corr) ? corr : []))
      } catch {
        // Silently skip
      }
    }
    setStockCorrections(allCorrections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }, [products])
```

- [ ] **Step 5: Add saveStockCorrection function**

Add this function before the return statement:

```typescript
  const saveStockCorrection = async () => {
    if (!corrProductId || !corrQuantity || !corrReason.trim()) {
      alert('Artikel, Menge und Grund erforderlich')
      return
    }

    setSavingCorr(true)
    try {
      const response = await fetch(`/api/kassenbuch/products/${corrProductId}/stock-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(corrQuantity),
          reason: corrReason.trim(),
          batchNumber: corrBatch.trim() || null,
          expiryDate: corrExpiry || null,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Fehler beim Speichern')
      }

      // Clear form and reload
      setCorrProductId(null)
      setCorrQuantity('')
      setCorrReason('')
      setCorrBatch('')
      setCorrExpiry('')
      setShowStockCorrection(false)
      
      // Reload products to update stock quantities and corrections
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSavingCorr(false)
    }
  }
```

- [ ] **Step 6: Add tab button for "Lagerkorrektionen"**

Find the tab buttons section (they appear as `<button>` elements with onClick setters). Add this button after the "Ausgaben" button:

```typescript
      <button onClick={() => setTab('lagerkorrektionen')} className={`px-4 py-2 rounded ${tab === 'lagerkorrektionen' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
        Lagerkorrektionen
      </button>
```

- [ ] **Step 7: Add "Lagerkorrektionen" tab content**

Find the section where tabs are rendered (after `{tab === 'ausgaben' && ...}`), and add:

```typescript
      {tab === 'lagerkorrektionen' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Lagerkorrektionen</h3>
            <button
              onClick={() => setShowStockCorrection(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Neue Korrektur
            </button>
          </div>

          {stockCorrections.length === 0 ? (
            <p className="text-gray-500">Keine Korrektionen erfasst</p>
          ) : (
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Produkt</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Menge</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Grund</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Charge</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">MHD</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Datum</th>
                </tr>
              </thead>
              <tbody>
                {stockCorrections.map(corr => {
                  const prod = products.find(p => p.id === corr.productId)
                  return (
                    <tr key={corr.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{prod?.name || 'Unbekannt'}</td>
                      <td className={`border border-gray-300 px-4 py-2 text-right font-semibold ${corr.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {corr.quantity > 0 ? '+' : ''}{corr.quantity}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{corr.reason}</td>
                      <td className="border border-gray-300 px-4 py-2">{corr.batchNumber || '-'}</td>
                      <td className="border border-gray-300 px-4 py-2">{corr.expiryDate ? fmtDate(corr.expiryDate) : '-'}</td>
                      <td className="border border-gray-300 px-4 py-2">{fmtDate(corr.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
```

- [ ] **Step 8: Add modal for new stock correction**

Find where other modals are rendered (after the expense modal, before closing of JSX), and add:

```typescript
      {showStockCorrection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Neue Lagerkorrektur</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Artikel</label>
                <select
                  value={corrProductId || ''}
                  onChange={e => setCorrProductId(e.target.value || null)}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">-- Wählen --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit}) - Bestand: {p.stockQuantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Menge</label>
                <input
                  type="number"
                  value={corrQuantity}
                  onChange={e => setCorrQuantity(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="z.B. 5 oder -3"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Grund</label>
                <input
                  type="text"
                  value={corrReason}
                  onChange={e => setCorrReason(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="z.B. Abweichung Inventur"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Chargennummer (optional)</label>
                <input
                  type="text"
                  value={corrBatch}
                  onChange={e => setCorrBatch(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="z.B. 2025-HONIG-003"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mindesthaltbarkeitsdatum (optional)</label>
                <input
                  type="date"
                  value={corrExpiry}
                  onChange={e => setCorrExpiry(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowStockCorrection(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Abbrechen
              </button>
              <button
                onClick={saveStockCorrection}
                disabled={savingCorr}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {savingCorr ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 9: Test the UI locally**

```bash
cd C:\Users\koerbe\PycharmProjects\Bee
npm run dev
# Navigate to Kassenbuch page, click the new "Lagerkorrektionen" tab
# Test creating a new correction via the modal
```

Expected: Modal appears, form fields work, can save a correction and see it in the table.

- [ ] **Step 10: Commit**

```bash
git add src/app/dashboard/kassenbuch/page.tsx
git commit -m "feat: add stock corrections tab and modal UI to kassenbuch"
```

---

## Feature 2: Colony Metadata

### Task 4: Extend Colony model with foundedAt and notes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to Colony model**

Find the `Colony` model (around line 45) and add these two fields after `createdAt`:

```prisma
  foundedAt   DateTime?
  notes       String?
```

Full `Colony` model should now have these fields at the end:
```prisma
  createdAt       DateTime        @default(now())
  foundedAt       DateTime?
  notes           String?
```

- [ ] **Step 2: Run Prisma migration**

```bash
cd C:\Users\koerbe\PycharmProjects\Bee
npx prisma migrate dev --name add_colony_metadata
```

Expected output: Migration created and applied successfully.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add foundedAt and notes fields to Colony model"
```

---

### Task 5: Update Colony detail view UI (Assuming structure based on codebase patterns)

**Files:**
- Modify: Colony detail component (exact path needs verification — likely `src/app/dashboard/voelker/[id]/page.tsx` or similar)

- [ ] **Step 1: Locate the colony detail page**

```bash
find src -name "*voelker*" -o -name "*colony*" | grep -i page
```

Expected: Should find something like `src/app/dashboard/voelker/[id]/page.tsx` or `src/app/dashboard/colonies/[id]/page.tsx`

- [ ] **Step 2: Add foundedAt and notes inputs to the edit form**

Once located, find the form section where other Colony fields are edited (like `name`, `queenYear`, etc.). Add these two input fields:

```typescript
      <div>
        <label className="block font-semibold mb-1">Gründungsdatum</label>
        <input
          type="date"
          value={colony.foundedAt ? colony.foundedAt.slice(0, 10) : ''}
          onChange={e => setColony({ ...colony, foundedAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
          className="w-full border rounded px-2 py-1"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Notizen</label>
        <textarea
          value={colony.notes || ''}
          onChange={e => setColony({ ...colony, notes: e.target.value })}
          className="w-full border rounded px-2 py-1 min-h-[100px]"
          placeholder="Notizen und Infos zum Volk..."
        />
      </div>
```

- [ ] **Step 3: Ensure the PUT endpoint persists these fields**

Find the API endpoint that handles Colony updates (likely `src/app/api/colonies/[id]/route.ts` or similar) and verify it includes these fields in the update:

```typescript
const updated = await prisma.colony.update({
  where: { id },
  data: {
    // ... existing fields ...
    foundedAt: body.foundedAt ? new Date(body.foundedAt) : undefined,
    notes: body.notes || null,
  },
})
```

If the endpoint doesn't explicitly handle these fields but uses object spread, it should already work. Test it.

- [ ] **Step 4: Display foundedAt and notes in the detail view**

In the colony detail display section (non-edit mode), add:

```typescript
      {foundedAt && (
        <div>
          <span className="font-semibold">Gründungsdatum:</span> {fmtDate(colony.foundedAt)}
        </div>
      )}

      {colony.notes && (
        <div>
          <span className="font-semibold">Notizen:</span>
          <p className="whitespace-pre-wrap">{colony.notes}</p>
        </div>
      )}
```

- [ ] **Step 5: Test the colony UI locally**

```bash
npm run dev
# Navigate to a colony detail page
# Test adding/editing foundedAt and notes
# Verify they persist after save
```

Expected: Fields appear, can edit them, data saves and displays correctly.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/[voelker or colonies]/[id]/page.tsx src/app/api/colonies/[id]/route.ts
git commit -m "feat: add foundedAt and notes UI to colony detail view"
```

---

## Verification & Final Commit

### Task 6: Full Integration Testing

- [ ] **Step 1: Test Feature 1 — Stock Corrections**

1. Go to Kassenbuch page
2. Create a product with initial stock (e.g., 10 units)
3. Click "Lagerkorrektionen" tab
4. Click "+ Neue Korrektur"
5. Fill in: Product, Quantity (e.g., -3), Reason ("Test"), Batch ("TEST-001"), Expiry ("2026-12-31")
6. Save
7. Verify:
   - New row appears in table with correct values
   - Product stock is reduced by 3 (from 10 to 7)
   - Positive corrections (e.g., +5) also work

- [ ] **Step 2: Test Feature 2 — Colony Metadata**

1. Go to a colony detail page
2. Click edit mode
3. Fill in Gründungsdatum (e.g., 2024-03-15)
4. Fill in Notizen (e.g., "Starke Volkskraft")
5. Save
6. Verify:
   - Fields display correctly in detail view
   - Data persists on page reload

- [ ] **Step 3: Test Edge Cases**

- Negative quantities in corrections
- Missing required fields → should show error alerts
- Empty/null optional fields (batch, expiry, notes) should display as "-" or blank
- Very long notes text should wrap correctly

- [ ] **Step 4: Final push**

```bash
git log --oneline -10
# Verify all commits are present
git push origin main
```

Expected: All commits pushed to main branch.

---

## Rollback Plan

If anything breaks:

```bash
git reset --hard HEAD~6
# Or specifically:
git revert <commit-hash>
npx prisma migrate resolve --rolled-back add_stock_corrections
npx prisma migrate resolve --rolled-back add_colony_metadata
npx prisma migrate deploy
```

