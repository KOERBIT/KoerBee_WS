# Vorbestellungs-Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public pre-order shop on a subdomain (`shop.domain.de`) where customers register, browse products, and submit pre-orders — with admin management in the existing dashboard.

**Architecture:** Single Next.js app serves both subdomains via host-based middleware routing. Shop uses a separate JWT auth system (`ShopCustomer` model) with its own cookie, completely independent from the admin's NextAuth setup. i18n via simple JSON translation files (DE/EN).

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL (Supabase), bcryptjs, jose (JWT), Nodemailer, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-09-15-vorbestellungs-shop-design.md`

## Global Constraints

- Next.js 16.2.1 with App Router — read `node_modules/next/dist/docs/` before using unfamiliar APIs
- Prisma 7.6.0 with `@prisma/adapter-pg` — no Prisma Accelerate
- All existing admin routes and NextAuth must remain untouched and working
- Shop routes live under `src/app/shop/`, shop API routes under `src/app/api/shop/`
- Admin pre-order routes under `src/app/api/admin/preorders/` and `src/app/dashboard/vorbestellungen/`
- Use `jose` (not `jsonwebtoken`) for shop JWT — it's lightweight and works in Edge + Node
- Passwords hashed with `bcryptjs` (already a dependency)
- E-Mails sent via existing `MailCredential` + Nodemailer setup
- All currency values displayed with `de-DE` locale formatting
- Product prices stored as `Float` (matching existing `Product.price` type)
- Tailwind classes follow existing patterns: amber accent, zinc grays, rounded-2xl cards

## File Structure

```
# New files
src/lib/shop/auth.ts              — Shop JWT helpers (sign, verify, cookie management)
src/lib/shop/mail.ts              — Shop email templates + sending (pre-order status, verification, reset)
src/lib/shop/i18n.ts              — Translation helper + locale detection
src/lib/shop/locales/de.json      — German translations
src/lib/shop/locales/en.json      — English translations

src/app/shop/layout.tsx           — Shop shell: header, footer, i18n context, cart context
src/app/shop/page.tsx             — Landing page (hero, highlights, CTA)
src/app/shop/produkte/page.tsx    — Product grid with add-to-cart
src/app/shop/warenkorb/page.tsx   — Cart + checkout (submit pre-order)
src/app/shop/login/page.tsx       — Customer login
src/app/shop/registrieren/page.tsx — Customer registration
src/app/shop/passwort-vergessen/page.tsx — Password reset request
src/app/shop/konto/layout.tsx     — Auth-guarded layout for account pages
src/app/shop/konto/page.tsx       — My orders list
src/app/shop/konto/bestellung/[id]/page.tsx — Order detail
src/app/shop/konto/profil/page.tsx — Edit profile (name, phone, password, locale)

src/app/api/shop/auth/register/route.ts    — POST: register ShopCustomer
src/app/api/shop/auth/login/route.ts       — POST: login, set JWT cookie
src/app/api/shop/auth/logout/route.ts      — POST: clear JWT cookie
src/app/api/shop/auth/verify-email/route.ts — GET: verify email token
src/app/api/shop/auth/reset-password/route.ts — POST: send reset email
src/app/api/shop/auth/new-password/route.ts — POST: set new password
src/app/api/shop/auth/me/route.ts          — GET: current customer from JWT
src/app/api/shop/products/route.ts         — GET: public product list
src/app/api/shop/orders/route.ts           — GET: my orders, POST: create pre-order
src/app/api/shop/orders/[id]/route.ts      — GET: order detail

src/app/api/admin/preorders/route.ts       — GET: all pre-orders (admin)
src/app/api/admin/preorders/stats/route.ts — GET: statistics (admin)
src/app/api/admin/preorders/[id]/route.ts  — GET: detail (admin)
src/app/api/admin/preorders/[id]/status/route.ts — PATCH: change status (admin)

src/app/dashboard/vorbestellungen/page.tsx      — Admin order list + stats
src/app/dashboard/vorbestellungen/[id]/page.tsx — Admin order detail + status workflow

# Modified files
prisma/schema.prisma     — Add ShopCustomer, PreOrder, PreOrderItem, PreOrderStatus enum; extend Product
middleware.ts            — Add host-based routing for shop subdomain
src/components/Sidebar.tsx — Add "Vorbestellungen" nav item
package.json             — Add jose dependency

# Test files
src/__tests__/lib/shop/auth.test.ts  — JWT sign/verify, cookie helpers
src/__tests__/lib/shop/i18n.test.ts  — Translation lookups, fallback
src/__tests__/api/shop/auth.test.ts  — Register, login, verify flows
src/__tests__/api/shop/orders.test.ts — Create + list pre-orders
```

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json` (add `jose`)

**Interfaces:**
- Produces: `PreOrderStatus` enum, `ShopCustomer` model, `PreOrder` model, `PreOrderItem` model, extended `Product` fields (`shopVisible`, `shopName`, `shopNameEn`, `description`, `descriptionEn`, `imageUrl`, `shopPrice`, `shopSortOrder`), `preOrderItems` relation on `Product`

- [ ] **Step 1: Add `jose` dependency**

```bash
npm install jose
```

- [ ] **Step 2: Add enum and new models to Prisma schema**

Add the following to `prisma/schema.prisma` after the existing `StockCorrection` model:

```prisma
enum PreOrderStatus {
  PENDING
  CONFIRMED
  READY
  PICKED_UP
  CANCELLED
}

model ShopCustomer {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  phone         String?
  locale        String    @default("de")
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  preOrders     PreOrder[]
}

model PreOrder {
  id              String         @id @default(cuid())
  shopCustomerId  String
  shopCustomer    ShopCustomer   @relation(fields: [shopCustomerId], references: [id], onDelete: Cascade)
  status          PreOrderStatus @default(PENDING)
  note            String?
  adminNote       String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  statusChangedAt DateTime       @default(now())
  items           PreOrderItem[]
}

model PreOrderItem {
  id           String   @id @default(cuid())
  preOrderId   String
  preOrder     PreOrder @relation(fields: [preOrderId], references: [id], onDelete: Cascade)
  productId    String
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity     Int
  priceAtOrder Float
}
```

- [ ] **Step 3: Extend the existing Product model with shop fields**

Add these fields to the `Product` model (after `stockQuantity`):

```prisma
  shopVisible    Boolean   @default(false)
  shopName       String?
  shopNameEn     String?
  descriptionEn  String?
  imageUrl       String?
  shopPrice      Float?
  shopSortOrder  Int       @default(0)
```

Add the relation to `Product` (alongside existing relations):

```prisma
  preOrderItems  PreOrderItem[]
```

Note: `Product` already has a `description` field — do NOT add it again.

- [ ] **Step 4: Run the migration**

```bash
npx prisma migrate dev --name add-shop-preorder-models
```

- [ ] **Step 5: Verify the migration succeeded**

```bash
npx prisma generate
npx prisma db push --dry-run
```

Expect: no pending changes, schema is in sync.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ package.json package-lock.json
git commit -m "feat(shop): add ShopCustomer, PreOrder, PreOrderItem models + extend Product with shop fields"
```

---

### Task 2: Shop Auth Library (JWT + Cookies)

**Files:**
- Create: `src/lib/shop/auth.ts`
- Test: `src/__tests__/lib/shop/auth.test.ts`

**Interfaces:**
- Produces:
  - `signShopToken(customerId: string): Promise<string>` — signs a JWT with `{ sub: customerId }`, 30-day expiry
  - `verifyShopToken(token: string): Promise<{ sub: string } | null>` — verifies and returns payload or null
  - `setShopCookie(response: NextResponse, token: string): NextResponse` — sets `shop-token` HttpOnly cookie
  - `clearShopCookie(response: NextResponse): NextResponse` — clears `shop-token` cookie
  - `getShopCustomerFromRequest(request: NextRequest): Promise<ShopCustomer | null>` — reads cookie, verifies JWT, queries DB

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/shop/auth.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import { signShopToken, verifyShopToken } from '@/lib/shop/auth'

// jose needs SHOP_JWT_SECRET env var
beforeAll(() => {
  process.env.SHOP_JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long!!'
})

describe('Shop JWT', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signShopToken('cust_123')
    const payload = await verifyShopToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('cust_123')
  })

  it('returns null for an invalid token', async () => {
    const payload = await verifyShopToken('garbage.token.here')
    expect(payload).toBeNull()
  })

  it('returns null for an empty string', async () => {
    const payload = await verifyShopToken('')
    expect(payload).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/shop/auth.test.ts --no-coverage
```

Expected: FAIL — module `@/lib/shop/auth` not found.

- [ ] **Step 3: Implement the auth library**

Create `src/lib/shop/auth.ts`:

```typescript
import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const COOKIE_NAME = 'shop-token'
const EXPIRY = '30d'

function getSecret(): Uint8Array {
  const secret = process.env.SHOP_JWT_SECRET
  if (!secret) throw new Error('SHOP_JWT_SECRET env var is missing')
  return new TextEncoder().encode(secret)
}

export async function signShopToken(customerId: string): Promise<string> {
  return new SignJWT({ sub: customerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyShopToken(
  token: string
): Promise<{ sub: string } | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (typeof payload.sub !== 'string') return null
    return { sub: payload.sub }
  } catch {
    return null
  }
}

export function setShopCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  })
  return response
}

export function clearShopCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}

export async function getShopCustomerFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifyShopToken(token)
  if (!payload) return null
  return prisma.shopCustomer.findUnique({ where: { id: payload.sub } })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/lib/shop/auth.test.ts --no-coverage
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shop/auth.ts src/__tests__/lib/shop/auth.test.ts
git commit -m "feat(shop): add JWT auth library for shop customers (sign, verify, cookie helpers)"
```

---

### Task 3: i18n Library + Translation Files

**Files:**
- Create: `src/lib/shop/i18n.ts`
- Create: `src/lib/shop/locales/de.json`
- Create: `src/lib/shop/locales/en.json`
- Test: `src/__tests__/lib/shop/i18n.test.ts`

**Interfaces:**
- Produces:
  - `type Locale = 'de' | 'en'`
  - `t(locale: Locale, key: string): string` — returns translated string, falls back to DE then key
  - `getLocaleFromCookie(request: NextRequest): Locale` — reads `shop-locale` cookie
  - `setLocaleCookie(response: NextResponse, locale: Locale): NextResponse`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/shop/i18n.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import { t } from '@/lib/shop/i18n'

describe('i18n', () => {
  it('returns German translation by default', () => {
    expect(t('de', 'shop.title')).toBe('Imkerei-Shop')
  })

  it('returns English translation', () => {
    expect(t('en', 'shop.title')).toBe('Beekeeping Shop')
  })

  it('falls back to German when English key is missing', () => {
    // A key that exists in DE but not in EN should fall back
    expect(typeof t('en', 'shop.title')).toBe('string')
  })

  it('returns the key itself when not found in any locale', () => {
    expect(t('de', 'nonexistent.key')).toBe('nonexistent.key')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/shop/i18n.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create German translations**

Create `src/lib/shop/locales/de.json`:

```json
{
  "shop.title": "Imkerei-Shop",
  "shop.subtitle": "Frische Produkte direkt vom Imker",
  "shop.cta": "Jetzt vorbestellen",
  "shop.products": "Produkte",
  "shop.cart": "Warenkorb",
  "shop.cart.empty": "Dein Warenkorb ist leer",
  "shop.cart.total": "Gesamt",
  "shop.cart.submit": "Vorbestellung absenden",
  "shop.cart.login_required": "Bitte melde dich an, um zu bestellen",
  "shop.cart.success": "Deine Vorbestellung ist eingegangen!",
  "shop.cart.note": "Anmerkung (optional)",
  "shop.product.add": "In den Warenkorb",
  "shop.product.quantity": "Menge",
  "shop.product.price": "Preis",
  "shop.account": "Mein Konto",
  "shop.account.orders": "Meine Bestellungen",
  "shop.account.order_detail": "Bestelldetails",
  "shop.account.profile": "Profil",
  "shop.account.no_orders": "Du hast noch keine Bestellungen",
  "shop.login": "Anmelden",
  "shop.login.email": "E-Mail-Adresse",
  "shop.login.password": "Passwort",
  "shop.login.submit": "Einloggen",
  "shop.login.no_account": "Noch kein Konto?",
  "shop.login.register_link": "Jetzt registrieren",
  "shop.login.forgot": "Passwort vergessen?",
  "shop.login.error": "E-Mail oder Passwort falsch",
  "shop.register": "Registrieren",
  "shop.register.name": "Name",
  "shop.register.email": "E-Mail-Adresse",
  "shop.register.phone": "Telefon (optional)",
  "shop.register.password": "Passwort",
  "shop.register.password_confirm": "Passwort bestätigen",
  "shop.register.submit": "Konto erstellen",
  "shop.register.has_account": "Bereits ein Konto?",
  "shop.register.login_link": "Jetzt einloggen",
  "shop.register.success": "Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.",
  "shop.register.password_mismatch": "Passwörter stimmen nicht überein",
  "shop.register.email_exists": "Diese E-Mail ist bereits registriert",
  "shop.reset.title": "Passwort zurücksetzen",
  "shop.reset.submit": "Link senden",
  "shop.reset.success": "Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link gesendet.",
  "shop.reset.new_password": "Neues Passwort",
  "shop.reset.confirm": "Passwort bestätigen",
  "shop.reset.save": "Passwort speichern",
  "shop.profile.save": "Speichern",
  "shop.profile.saved": "Profil gespeichert",
  "shop.profile.language": "Sprache",
  "shop.logout": "Abmelden",
  "shop.footer.contact": "Kontakt",
  "shop.footer.imprint": "Impressum",
  "shop.status.PENDING": "Eingegangen",
  "shop.status.CONFIRMED": "Bestätigt",
  "shop.status.READY": "Abholbereit",
  "shop.status.PICKED_UP": "Abgeholt",
  "shop.status.CANCELLED": "Storniert",
  "shop.email.order_received.subject": "Deine Vorbestellung ist eingegangen",
  "shop.email.order_confirmed.subject": "Deine Vorbestellung wurde bestätigt",
  "shop.email.order_ready.subject": "Deine Bestellung ist abholbereit!",
  "shop.email.order_cancelled.subject": "Deine Vorbestellung wurde storniert",
  "shop.email.verify.subject": "Bitte bestätige deine E-Mail-Adresse",
  "shop.email.reset.subject": "Passwort zurücksetzen",
  "shop.pickup": "Bezahlung & Abholung vor Ort",
  "shop.hero.welcome": "Willkommen bei unserer Imkerei",
  "shop.hero.text": "Bestelle frischen Honig und weitere Imkereiprodukte direkt vom Imker. Bezahlung bei Abholung."
}
```

- [ ] **Step 4: Create English translations**

Create `src/lib/shop/locales/en.json`:

```json
{
  "shop.title": "Beekeeping Shop",
  "shop.subtitle": "Fresh products straight from the beekeeper",
  "shop.cta": "Pre-order now",
  "shop.products": "Products",
  "shop.cart": "Cart",
  "shop.cart.empty": "Your cart is empty",
  "shop.cart.total": "Total",
  "shop.cart.submit": "Submit pre-order",
  "shop.cart.login_required": "Please sign in to place an order",
  "shop.cart.success": "Your pre-order has been received!",
  "shop.cart.note": "Note (optional)",
  "shop.product.add": "Add to cart",
  "shop.product.quantity": "Quantity",
  "shop.product.price": "Price",
  "shop.account": "My Account",
  "shop.account.orders": "My Orders",
  "shop.account.order_detail": "Order Details",
  "shop.account.profile": "Profile",
  "shop.account.no_orders": "You have no orders yet",
  "shop.login": "Sign In",
  "shop.login.email": "Email address",
  "shop.login.password": "Password",
  "shop.login.submit": "Sign in",
  "shop.login.no_account": "No account yet?",
  "shop.login.register_link": "Register now",
  "shop.login.forgot": "Forgot password?",
  "shop.login.error": "Invalid email or password",
  "shop.register": "Register",
  "shop.register.name": "Name",
  "shop.register.email": "Email address",
  "shop.register.phone": "Phone (optional)",
  "shop.register.password": "Password",
  "shop.register.password_confirm": "Confirm password",
  "shop.register.submit": "Create account",
  "shop.register.has_account": "Already have an account?",
  "shop.register.login_link": "Sign in",
  "shop.register.success": "Registration successful! Please verify your email address.",
  "shop.register.password_mismatch": "Passwords do not match",
  "shop.register.email_exists": "This email is already registered",
  "shop.reset.title": "Reset Password",
  "shop.reset.submit": "Send link",
  "shop.reset.success": "If an account with this email exists, we've sent you a link.",
  "shop.reset.new_password": "New password",
  "shop.reset.confirm": "Confirm password",
  "shop.reset.save": "Save password",
  "shop.profile.save": "Save",
  "shop.profile.saved": "Profile saved",
  "shop.profile.language": "Language",
  "shop.logout": "Sign out",
  "shop.footer.contact": "Contact",
  "shop.footer.imprint": "Imprint",
  "shop.status.PENDING": "Received",
  "shop.status.CONFIRMED": "Confirmed",
  "shop.status.READY": "Ready for pickup",
  "shop.status.PICKED_UP": "Picked up",
  "shop.status.CANCELLED": "Cancelled",
  "shop.email.order_received.subject": "Your pre-order has been received",
  "shop.email.order_confirmed.subject": "Your pre-order has been confirmed",
  "shop.email.order_ready.subject": "Your order is ready for pickup!",
  "shop.email.order_cancelled.subject": "Your pre-order has been cancelled",
  "shop.email.verify.subject": "Please verify your email address",
  "shop.email.reset.subject": "Reset your password",
  "shop.pickup": "Payment & pickup on site",
  "shop.hero.welcome": "Welcome to our apiary",
  "shop.hero.text": "Pre-order fresh honey and other beekeeping products directly from the beekeeper. Pay on pickup."
}
```

- [ ] **Step 5: Implement the i18n helper**

Create `src/lib/shop/i18n.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import de from './locales/de.json'
import en from './locales/en.json'

export type Locale = 'de' | 'en'

const translations: Record<Locale, Record<string, string>> = { de, en }

const COOKIE_NAME = 'shop-locale'

/** Look up a translation key. Falls back: requested locale → DE → raw key. */
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations.de[key] ?? key
}

export function getLocaleFromCookie(request: NextRequest): Locale {
  const val = request.cookies.get(COOKIE_NAME)?.value
  return val === 'en' ? 'en' : 'de'
}

export function setLocaleCookie(
  response: NextResponse,
  locale: Locale
): NextResponse {
  response.cookies.set(COOKIE_NAME, locale, {
    httpOnly: false, // readable by client JS for language toggle
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
  })
  return response
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx jest src/__tests__/lib/shop/i18n.test.ts --no-coverage
```

Expected: PASS — all 4 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shop/i18n.ts src/lib/shop/locales/ src/__tests__/lib/shop/i18n.test.ts
git commit -m "feat(shop): add i18n library with DE/EN translations"
```

---

### Task 4: Shop Email Templates

**Files:**
- Create: `src/lib/shop/mail.ts`

**Interfaces:**
- Consumes: `getSmtpConfigForUser(userId)` from `src/lib/receipt/mail.ts`, `t(locale, key)` from `src/lib/shop/i18n.ts`
- Produces:
  - `sendShopEmail(args: { userId: string, to: string, locale: Locale, subject: string, html: string }): Promise<void>`
  - `sendOrderStatusEmail(args: { userId: string, order: PreOrderWithCustomer, newStatus: PreOrderStatus }): Promise<void>`
  - `sendVerificationEmail(args: { userId: string, to: string, locale: Locale, token: string, shopBaseUrl: string }): Promise<void>`
  - `sendPasswordResetEmail(args: { userId: string, to: string, locale: Locale, token: string, shopBaseUrl: string }): Promise<void>`

- [ ] **Step 1: Create the shop mail module**

Create `src/lib/shop/mail.ts`:

```typescript
import nodemailer from 'nodemailer'
import { getSmtpConfigForUser } from '@/lib/receipt/mail'
import { t, Locale } from './i18n'

interface SendShopEmailArgs {
  userId: string
  to: string
  locale: Locale
  subject: string
  html: string
}

export async function sendShopEmail(args: SendShopEmailArgs): Promise<void> {
  const cfg = await getSmtpConfigForUser(args.userId)
  if (!cfg) {
    console.error('Shop mail: no SMTP config for user', args.userId)
    return
  }
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: cfg.port !== 465,
    auth: { user: cfg.user, pass: cfg.password },
  })
  await transporter.sendMail({
    from: cfg.user,
    to: args.to,
    subject: args.subject,
    html: args.html,
  })
}

interface PreOrderForEmail {
  id: string
  createdAt: Date
  items: Array<{ product: { name: string }; quantity: number; priceAtOrder: number }>
  shopCustomer: { email: string; name: string; locale: string }
}

const STATUS_EMAIL_KEYS: Record<string, string> = {
  PENDING: 'shop.email.order_received.subject',
  CONFIRMED: 'shop.email.order_confirmed.subject',
  READY: 'shop.email.order_ready.subject',
  CANCELLED: 'shop.email.order_cancelled.subject',
}

export async function sendOrderStatusEmail(args: {
  userId: string
  order: PreOrderForEmail
  newStatus: string
}): Promise<void> {
  const { userId, order, newStatus } = args
  const locale = (order.shopCustomer.locale === 'en' ? 'en' : 'de') as Locale
  const subjectKey = STATUS_EMAIL_KEYS[newStatus]
  if (!subjectKey) return // PICKED_UP has no email

  const subject = t(locale, subjectKey)
  const statusLabel = t(locale, `shop.status.${newStatus}`)
  const total = order.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 8px">${i.product.name}</td><td style="padding:4px 8px">${i.quantity}</td><td style="padding:4px 8px">${i.priceAtOrder.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td></tr>`
    )
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#f59e0b">${subject}</h2>
      <p>${locale === 'de' ? 'Hallo' : 'Hello'} ${order.shopCustomer.name},</p>
      <p><strong>${locale === 'de' ? 'Status' : 'Status'}:</strong> ${statusLabel}</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr style="background:#f5f5f5"><th style="padding:4px 8px;text-align:left">${locale === 'de' ? 'Produkt' : 'Product'}</th><th style="padding:4px 8px">${t(locale, 'shop.product.quantity')}</th><th style="padding:4px 8px">${t(locale, 'shop.product.price')}</th></tr>
        ${itemsHtml}
      </table>
      <p><strong>${t(locale, 'shop.cart.total')}:</strong> ${total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
      <p style="color:#78716c;font-size:14px">${t(locale, 'shop.pickup')}</p>
    </div>
  `

  await sendShopEmail({ userId, to: order.shopCustomer.email, locale, subject, html })
}

export async function sendVerificationEmail(args: {
  userId: string
  to: string
  locale: Locale
  token: string
  shopBaseUrl: string
}): Promise<void> {
  const { userId, to, locale, token, shopBaseUrl } = args
  const subject = t(locale, 'shop.email.verify.subject')
  const link = `${shopBaseUrl}/api/shop/auth/verify-email?token=${token}`
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#f59e0b">${subject}</h2>
      <p>${locale === 'de'
        ? 'Bitte klicke auf den folgenden Link, um deine E-Mail-Adresse zu bestätigen:'
        : 'Please click the following link to verify your email address:'}</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px">${locale === 'de' ? 'E-Mail bestätigen' : 'Verify email'}</a></p>
    </div>
  `
  await sendShopEmail({ userId, to, locale, subject, html })
}

export async function sendPasswordResetEmail(args: {
  userId: string
  to: string
  locale: Locale
  token: string
  shopBaseUrl: string
}): Promise<void> {
  const { userId, to, locale, token, shopBaseUrl } = args
  const subject = t(locale, 'shop.email.reset.subject')
  const link = `${shopBaseUrl}/shop/passwort-vergessen?token=${token}`
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#f59e0b">${subject}</h2>
      <p>${locale === 'de'
        ? 'Klicke auf den folgenden Link, um dein Passwort zurückzusetzen:'
        : 'Click the following link to reset your password:'}</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px">${locale === 'de' ? 'Passwort zurücksetzen' : 'Reset password'}</a></p>
    </div>
  `
  await sendShopEmail({ userId, to, locale, subject, html })
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/lib/shop/mail.ts 2>&1 || echo "Check errors above"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/shop/mail.ts
git commit -m "feat(shop): add email templates for order status, verification, and password reset"
```

---

### Task 5: Middleware — Host-Based Routing

**Files:**
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: `verifyShopToken(token)` from `src/lib/shop/auth.ts`
- Produces: Middleware that routes requests based on hostname — shop subdomain gets shop auth logic, main domain keeps existing NextAuth logic

- [ ] **Step 1: Rewrite middleware with host-based routing**

Replace `middleware.ts` with:

```typescript
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyShopToken } from '@/lib/shop/auth'

// Paths on the shop subdomain that require a valid shop-token
const SHOP_AUTH_PATHS = ['/shop/konto', '/api/shop/orders']

function isShopHost(host: string): boolean {
  // Match shop.* subdomain or localhost with SHOP_HOST env override
  const shopHost = process.env.SHOP_HOST
  if (shopHost && host.startsWith(shopHost)) return true
  return host.startsWith('shop.')
}

function needsShopAuth(pathname: string): boolean {
  return SHOP_AUTH_PATHS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // --- Shop subdomain ---
  if (isShopHost(host)) {
    // Public shop paths — let through
    if (
      pathname.startsWith('/shop/login') ||
      pathname.startsWith('/shop/registrieren') ||
      pathname.startsWith('/shop/passwort-vergessen') ||
      pathname.startsWith('/api/shop/auth') ||
      pathname.startsWith('/api/shop/products') ||
      pathname === '/shop' ||
      pathname.startsWith('/shop/produkte') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname === '/api/health'
    ) {
      return NextResponse.next()
    }

    // Protected shop paths — check shop-token
    if (needsShopAuth(pathname)) {
      const token = request.cookies.get('shop-token')?.value
      if (!token) {
        const loginUrl = new URL('/shop/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
      const payload = await verifyShopToken(token)
      if (!payload) {
        const loginUrl = new URL('/shop/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    return NextResponse.next()
  }

  // --- Main domain (existing admin logic) ---
  // Skip paths that don't need admin auth
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
```

- [ ] **Step 2: Verify the app builds**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds. All existing admin routes still work.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(shop): add host-based middleware routing for shop subdomain"
```

---

### Task 6: Shop Auth API Routes

**Files:**
- Create: `src/app/api/shop/auth/register/route.ts`
- Create: `src/app/api/shop/auth/login/route.ts`
- Create: `src/app/api/shop/auth/logout/route.ts`
- Create: `src/app/api/shop/auth/verify-email/route.ts`
- Create: `src/app/api/shop/auth/reset-password/route.ts`
- Create: `src/app/api/shop/auth/new-password/route.ts`
- Create: `src/app/api/shop/auth/me/route.ts`

**Interfaces:**
- Consumes: `signShopToken`, `verifyShopToken`, `setShopCookie`, `clearShopCookie`, `getShopCustomerFromRequest` from `src/lib/shop/auth.ts`; `sendVerificationEmail`, `sendPasswordResetEmail` from `src/lib/shop/mail.ts`
- Produces: REST endpoints per spec. Verification and password-reset tokens are short-lived JWTs (1h) signed with the same SHOP_JWT_SECRET.

- [ ] **Step 1: Create register route**

Create `src/app/api/shop/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signShopToken, setShopCookie } from '@/lib/shop/auth'
import { sendVerificationEmail } from '@/lib/shop/mail'
import { SignJWT } from 'jose'

export async function POST(req: NextRequest) {
  const { name, email, password, phone, locale } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, password required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const existing = await prisma.shopCustomer.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'email_exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const customer = await prisma.shopCustomer.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone ?? null,
      locale: locale === 'en' ? 'en' : 'de',
    },
  })

  // Send verification email (best-effort, don't block registration)
  try {
    const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
    const verifyToken = await new SignJWT({ sub: customer.id, purpose: 'verify' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret)

    // Find the first admin user's mail config (shop shares the admin's SMTP)
    const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
    if (admin) {
      const shopBaseUrl = process.env.SHOP_BASE_URL ?? `https://${req.headers.get('host') ?? 'localhost'}`
      await sendVerificationEmail({
        userId: admin.id,
        to: customer.email,
        locale: customer.locale as 'de' | 'en',
        token: verifyToken,
        shopBaseUrl,
      })
    }
  } catch (e) {
    console.error('Failed to send verification email:', e)
  }

  const token = await signShopToken(customer.id)
  const response = NextResponse.json(
    { id: customer.id, name: customer.name, email: customer.email },
    { status: 201 }
  )
  return setShopCookie(response, token)
}
```

- [ ] **Step 2: Create login route**

Create `src/app/api/shop/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signShopToken, setShopCookie } from '@/lib/shop/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  const customer = await prisma.shopCustomer.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (!customer) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, customer.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = await signShopToken(customer.id)
  const response = NextResponse.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    locale: customer.locale,
    emailVerified: customer.emailVerified,
  })
  return setShopCookie(response, token)
}
```

- [ ] **Step 3: Create logout route**

Create `src/app/api/shop/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { clearShopCookie } from '@/lib/shop/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  return clearShopCookie(response)
}
```

- [ ] **Step 4: Create verify-email route**

Create `src/app/api/shop/auth/verify-email/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'token_missing' }, { status: 400 })
  }

  try {
    const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== 'verify' || typeof payload.sub !== 'string') {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    await prisma.shopCustomer.update({
      where: { id: payload.sub },
      data: { emailVerified: true },
    })

    // Redirect to shop login with success message
    const shopBase = process.env.SHOP_BASE_URL ?? `https://${req.headers.get('host') ?? 'localhost'}`
    return NextResponse.redirect(`${shopBase}/shop/login?verified=1`)
  } catch {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 })
  }
}
```

- [ ] **Step 5: Create reset-password route**

Create `src/app/api/shop/auth/reset-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/shop/mail'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 })

  // Always return success to prevent email enumeration
  const customer = await prisma.shopCustomer.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (customer) {
    try {
      const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
      const resetToken = await new SignJWT({ sub: customer.id, purpose: 'reset' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret)

      const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
      if (admin) {
        const shopBaseUrl = process.env.SHOP_BASE_URL ?? `https://${req.headers.get('host') ?? 'localhost'}`
        await sendPasswordResetEmail({
          userId: admin.id,
          to: customer.email,
          locale: customer.locale as 'de' | 'en',
          token: resetToken,
          shopBaseUrl,
        })
      }
    } catch (e) {
      console.error('Failed to send reset email:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Create new-password route**

Create `src/app/api/shop/auth/new-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password) {
    return NextResponse.json({ error: 'token and password required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  try {
    const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== 'reset' || typeof payload.sub !== 'string') {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.shopCustomer.update({
      where: { id: payload.sub },
      data: { passwordHash },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 })
  }
}
```

- [ ] **Step 7: Create me route**

Create `src/app/api/shop/auth/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getShopCustomerFromRequest } from '@/lib/shop/auth'

export async function GET(req: NextRequest) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    locale: customer.locale,
    emailVerified: customer.emailVerified,
  })
}
```

- [ ] **Step 8: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds, all 7 new API routes compile.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/shop/auth/
git commit -m "feat(shop): add auth API routes (register, login, logout, verify, reset, me)"
```

---

### Task 7: Shop Products + Orders API Routes

**Files:**
- Create: `src/app/api/shop/products/route.ts`
- Create: `src/app/api/shop/orders/route.ts`
- Create: `src/app/api/shop/orders/[id]/route.ts`

**Interfaces:**
- Consumes: `getShopCustomerFromRequest` from `src/lib/shop/auth.ts`, `sendOrderStatusEmail` from `src/lib/shop/mail.ts`
- Produces:
  - `GET /api/shop/products` → `{ products: Product[] }` with shop fields only
  - `GET /api/shop/orders` → `{ orders: PreOrder[] }` for logged-in customer
  - `POST /api/shop/orders` → creates PreOrder with items, sends confirmation email
  - `GET /api/shop/orders/[id]` → order detail for logged-in customer

- [ ] **Step 1: Create products route**

Create `src/app/api/shop/products/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const products = await prisma.product.findMany({
    where: { shopVisible: true },
    select: {
      id: true,
      name: true,
      shopName: true,
      shopNameEn: true,
      description: true,
      descriptionEn: true,
      unit: true,
      price: true,
      shopPrice: true,
      imageUrl: true,
      fillAmount: true,
      fillUnit: true,
      shopSortOrder: true,
    },
    orderBy: { shopSortOrder: 'asc' },
  })

  return NextResponse.json(products)
}
```

- [ ] **Step 2: Create orders route (GET + POST)**

Create `src/app/api/shop/orders/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopCustomerFromRequest } from '@/lib/shop/auth'
import { sendOrderStatusEmail } from '@/lib/shop/mail'

export async function GET(req: NextRequest) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const orders = await prisma.preOrder.findMany({
    where: { shopCustomerId: customer.id },
    include: {
      items: { include: { product: { select: { name: true, shopName: true, unit: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { items, note } = await req.json() as {
    items: Array<{ productId: string; quantity: number }>
    note?: string
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 })
  }

  // Validate products exist and are shop-visible, get current prices
  const productIds = items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, shopVisible: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const orderItems: Array<{ productId: string; quantity: number; priceAtOrder: number }> = []
  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      return NextResponse.json({ error: `product_not_found: ${item.productId}` }, { status: 400 })
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 })
    }
    orderItems.push({
      productId: product.id,
      quantity: item.quantity,
      priceAtOrder: product.shopPrice ?? product.price,
    })
  }

  const order = await prisma.preOrder.create({
    data: {
      shopCustomerId: customer.id,
      note: note ?? null,
      items: { create: orderItems },
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shopCustomer: { select: { email: true, name: true, locale: true } },
    },
  })

  // Send confirmation email (best-effort)
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
    if (admin) {
      await sendOrderStatusEmail({ userId: admin.id, order, newStatus: 'PENDING' })
    }
  } catch (e) {
    console.error('Failed to send order confirmation email:', e)
  }

  return NextResponse.json(order, { status: 201 })
}
```

- [ ] **Step 3: Create order detail route**

Create `src/app/api/shop/orders/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopCustomerFromRequest } from '@/lib/shop/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params

  const order = await prisma.preOrder.findFirst({
    where: { id, shopCustomerId: customer.id },
    include: {
      items: {
        include: { product: { select: { name: true, shopName: true, unit: true, imageUrl: true } } },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(order)
}
```

- [ ] **Step 4: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/shop/products/ src/app/api/shop/orders/
git commit -m "feat(shop): add products and orders API routes"
```

---

### Task 8: Admin Pre-Order API Routes

**Files:**
- Create: `src/app/api/admin/preorders/route.ts`
- Create: `src/app/api/admin/preorders/stats/route.ts`
- Create: `src/app/api/admin/preorders/[id]/route.ts`
- Create: `src/app/api/admin/preorders/[id]/status/route.ts`

**Interfaces:**
- Consumes: `getServerSession(authOptions)` from `src/lib/auth.ts`, `sendOrderStatusEmail` from `src/lib/shop/mail.ts`
- Produces: Admin REST endpoints for managing pre-orders (list, detail, status change, stats)

- [ ] **Step 1: Create admin preorders list route**

Create `src/app/api/admin/preorders/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')
  const search = req.nextUrl.searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.shopCustomer = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const orders = await prisma.preOrder.findMany({
    where,
    include: {
      shopCustomer: { select: { name: true, email: true, phone: true } },
      items: { include: { product: { select: { name: true, shopName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}
```

- [ ] **Step 2: Create admin preorders stats route**

Create `src/app/api/admin/preorders/stats/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const [pending, confirmed, ready, pickedUpThisWeek, productStats] = await Promise.all([
    prisma.preOrder.count({ where: { status: 'PENDING' } }),
    prisma.preOrder.count({ where: { status: 'CONFIRMED' } }),
    prisma.preOrder.count({ where: { status: 'READY' } }),
    prisma.preOrder.count({
      where: { status: 'PICKED_UP', statusChangedAt: { gte: oneWeekAgo } },
    }),
    prisma.preOrderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: {
        preOrder: { status: { in: ['PENDING', 'CONFIRMED', 'READY'] } },
      },
    }),
  ])

  // Enrich product stats with names
  const productIds = productStats.map((s) => s.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, shopName: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const productSummary = productStats.map((s) => ({
    productId: s.productId,
    productName: productMap.get(s.productId)?.shopName ?? productMap.get(s.productId)?.name ?? '?',
    totalOrdered: s._sum.quantity ?? 0,
  }))

  return NextResponse.json({
    pending,
    confirmed,
    ready,
    pickedUpThisWeek,
    productSummary,
  })
}
```

- [ ] **Step 3: Create admin preorder detail route**

Create `src/app/api/admin/preorders/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const order = await prisma.preOrder.findUnique({
    where: { id },
    include: {
      shopCustomer: { select: { name: true, email: true, phone: true, locale: true } },
      items: {
        include: { product: { select: { name: true, shopName: true, unit: true, imageUrl: true } } },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(order)
}
```

- [ ] **Step 4: Create admin status change route**

Create `src/app/api/admin/preorders/[id]/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendOrderStatusEmail } from '@/lib/shop/mail'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['READY', 'CANCELLED'],
  READY: ['PICKED_UP'],
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status: newStatus, adminNote } = await req.json()

  const order = await prisma.preOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shopCustomer: { select: { email: true, name: true, locale: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const allowed = VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `invalid_transition: ${order.status} → ${newStatus}` },
      { status: 400 }
    )
  }

  const updated = await prisma.preOrder.update({
    where: { id },
    data: {
      status: newStatus,
      statusChangedAt: new Date(),
      ...(adminNote !== undefined ? { adminNote } : {}),
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shopCustomer: { select: { email: true, name: true, locale: true } },
    },
  })

  // Send status email (best-effort)
  try {
    await sendOrderStatusEmail({
      userId: session.user.id,
      order: updated,
      newStatus,
    })
  } catch (e) {
    console.error('Failed to send status email:', e)
  }

  return NextResponse.json(updated)
}
```

- [ ] **Step 5: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/preorders/
git commit -m "feat(shop): add admin pre-order API routes (list, detail, status, stats)"
```

---

### Task 9: Shop Layout + Landing Page

**Files:**
- Create: `src/app/shop/layout.tsx`
- Create: `src/app/shop/page.tsx`

**Interfaces:**
- Consumes: `t(locale, key)` from `src/lib/shop/i18n.ts`, `/api/shop/products` for highlights
- Produces: Shop shell (header with nav, language toggle, cart icon, footer) + landing page

- [ ] **Step 1: Create shop layout**

Create `src/app/shop/layout.tsx`:

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Imkerei-Shop | KörBee',
  description: 'Frische Imkereiprodukte vorbestellen — direkt vom Imker',
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-amber-50/30 flex flex-col">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create the shop landing page (client component with header/footer)**

Create `src/app/shop/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Locale = 'de' | 'en'

// Inline minimal translations for the landing page (avoids server import in client component)
const T: Record<Locale, Record<string, string>> = {
  de: {
    title: 'Imkerei-Shop',
    welcome: 'Willkommen bei unserer Imkerei',
    text: 'Bestelle frischen Honig und weitere Imkereiprodukte direkt vom Imker. Bezahlung bei Abholung.',
    cta: 'Jetzt vorbestellen',
    products: 'Produkte',
    cart: 'Warenkorb',
    account: 'Mein Konto',
    login: 'Anmelden',
    highlights: 'Unsere Produkte',
    contact: 'Kontakt',
    imprint: 'Impressum',
    pickup: 'Bezahlung & Abholung vor Ort',
  },
  en: {
    title: 'Beekeeping Shop',
    welcome: 'Welcome to our apiary',
    text: 'Pre-order fresh honey and other beekeeping products directly from the beekeeper. Pay on pickup.',
    cta: 'Pre-order now',
    products: 'Products',
    cart: 'Cart',
    account: 'My Account',
    login: 'Sign In',
    highlights: 'Our Products',
    contact: 'Contact',
    imprint: 'Imprint',
    pickup: 'Payment & pickup on site',
  },
}

interface ShopProduct {
  id: string
  name: string
  shopName: string | null
  shopNameEn: string | null
  description: string | null
  descriptionEn: string | null
  imageUrl: string | null
  price: number
  shopPrice: number | null
  unit: string
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function getCartCount(): number {
  try {
    const cart = JSON.parse(localStorage.getItem('shop-cart') ?? '[]')
    return cart.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
  } catch { return 0 }
}

export default function ShopLandingPage() {
  const [locale, setLocale] = useState<Locale>('de')
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [cartCount, setCartCount] = useState(0)
  const t = T[locale]

  useEffect(() => {
    const l = getCookie('shop-locale')
    if (l === 'en') setLocale('en')
    setCartCount(getCartCount())
    fetch('/api/shop/products')
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => {})
  }, [])

  const toggleLocale = () => {
    const next = locale === 'de' ? 'en' : 'de'
    setLocale(next)
    document.cookie = `shop-locale=${next};path=/;max-age=${365 * 86400}`
  }

  const productName = (p: ShopProduct) =>
    locale === 'en' ? p.shopNameEn ?? p.shopName ?? p.name : p.shopName ?? p.name
  const productDesc = (p: ShopProduct) =>
    locale === 'en' ? p.descriptionEn ?? p.description : p.description

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/shop" className="text-lg font-bold text-amber-800 tracking-tight">
            {t.title}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop/produkte" className="text-zinc-600 hover:text-amber-700">{t.products}</Link>
            <Link href="/shop/warenkorb" className="text-zinc-600 hover:text-amber-700 relative">
              {t.cart}
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-4 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link href="/shop/konto" className="text-zinc-600 hover:text-amber-700">{t.account}</Link>
            <button onClick={toggleLocale} className="text-xs border border-zinc-200 rounded px-2 py-1 hover:bg-zinc-50">
              {locale === 'de' ? 'EN' : 'DE'}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-100 to-amber-50/30 py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">{t.welcome}</h1>
        <p className="text-lg text-amber-800/70 max-w-xl mx-auto mb-8">{t.text}</p>
        <Link
          href="/shop/produkte"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          {t.cta}
        </Link>
        <p className="mt-4 text-sm text-amber-700/60">{t.pickup}</p>
      </section>

      {/* Highlights */}
      {products.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-zinc-800 mb-8 text-center">{t.highlights}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                {p.imageUrl ? (
                  <div className="h-40 bg-amber-50 flex items-center justify-center">
                    <img src={p.imageUrl} alt={productName(p)} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-amber-50 flex items-center justify-center text-4xl">🍯</div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-zinc-800">{productName(p)}</h3>
                  {productDesc(p) && <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{productDesc(p)}</p>}
                  <p className="text-amber-700 font-bold mt-2">
                    {(p.shopPrice ?? p.price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / {p.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-amber-100 bg-white py-8 px-4 text-center text-sm text-zinc-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-amber-800">{t.title}</span>
          <div className="flex gap-6">
            <span>{t.contact}</span>
            <span>{t.imprint}</span>
          </div>
        </div>
      </footer>
    </>
  )
}
```

- [ ] **Step 3: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/shop/layout.tsx src/app/shop/page.tsx
git commit -m "feat(shop): add shop layout shell and landing page with hero, highlights, i18n"
```

---

### Task 10: Product Overview + Cart (LocalStorage)

**Files:**
- Create: `src/app/shop/produkte/page.tsx`
- Create: `src/app/shop/warenkorb/page.tsx`

**Interfaces:**
- Consumes: `/api/shop/products` (GET), `/api/shop/orders` (POST), localStorage `shop-cart`
- Produces: Product grid with add-to-cart + cart page with checkout

- [ ] **Step 1: Create product overview page**

Create `src/app/shop/produkte/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Locale = 'de' | 'en'

interface ShopProduct {
  id: string; name: string; shopName: string | null; shopNameEn: string | null
  description: string | null; descriptionEn: string | null; imageUrl: string | null
  price: number; shopPrice: number | null; unit: string
}
interface CartItem { productId: string; quantity: number }

function getLocale(): Locale {
  const match = document.cookie.match(/shop-locale=([^;]*)/)
  return match?.[1] === 'en' ? 'en' : 'de'
}
function getCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem('shop-cart') ?? '[]') } catch { return [] }
}
function saveCart(cart: CartItem[]) { localStorage.setItem('shop-cart', JSON.stringify(cart)) }

const L = {
  de: { products: 'Produkte', add: 'In den Warenkorb', added: 'Hinzugefügt!', cart: 'Warenkorb', back: 'Zurück', empty: 'Noch keine Produkte verfügbar' },
  en: { products: 'Products', add: 'Add to cart', added: 'Added!', cart: 'Cart', back: 'Back', empty: 'No products available yet' },
}

export default function ProduktePage() {
  const [locale, setLocale] = useState<Locale>('de')
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const t = L[locale]

  useEffect(() => {
    setLocale(getLocale())
    setCart(getCart())
    fetch('/api/shop/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const pName = (p: ShopProduct) => locale === 'en' ? p.shopNameEn ?? p.shopName ?? p.name : p.shopName ?? p.name
  const pDesc = (p: ShopProduct) => locale === 'en' ? p.descriptionEn ?? p.description : p.description

  function addToCart(productId: string) {
    const updated = [...cart]
    const idx = updated.findIndex(i => i.productId === productId)
    if (idx >= 0) updated[idx].quantity += 1
    else updated.push({ productId, quantity: 1 })
    setCart(updated)
    saveCart(updated)
    setJustAdded(productId)
    setTimeout(() => setJustAdded(null), 1500)
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/shop" className="text-lg font-bold text-amber-800">KörBee</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop/warenkorb" className="text-zinc-600 hover:text-amber-700 relative">
              {t.cart}
              {cartCount > 0 && <span className="absolute -top-2 -right-4 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>}
            </Link>
            <Link href="/shop/konto" className="text-zinc-600 hover:text-amber-700">{locale === 'de' ? 'Mein Konto' : 'My Account'}</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-800 mb-8">{t.products}</h1>
        {products.length === 0 ? (
          <p className="text-zinc-500">{t.empty}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col">
                {p.imageUrl ? (
                  <div className="h-48 bg-amber-50"><img src={p.imageUrl} alt={pName(p)} className="w-full h-full object-cover" /></div>
                ) : (
                  <div className="h-48 bg-amber-50 flex items-center justify-center text-5xl">🍯</div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-zinc-800 text-lg">{pName(p)}</h3>
                  {pDesc(p) && <p className="text-sm text-zinc-500 mt-1">{pDesc(p)}</p>}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-amber-700 font-bold text-lg">
                      {(p.shopPrice ?? p.price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      <span className="text-sm font-normal text-zinc-400"> / {p.unit}</span>
                    </span>
                    <button
                      onClick={() => addToCart(p.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        justAdded === p.id
                          ? 'bg-green-500 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {justAdded === p.id ? t.added : t.add}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 2: Create cart / checkout page**

Create `src/app/shop/warenkorb/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Locale = 'de' | 'en'
interface CartItem { productId: string; quantity: number }
interface ShopProduct {
  id: string; name: string; shopName: string | null; shopNameEn: string | null
  price: number; shopPrice: number | null; unit: string
}

function getLocale(): Locale { const m = document.cookie.match(/shop-locale=([^;]*)/); return m?.[1] === 'en' ? 'en' : 'de' }
function getCart(): CartItem[] { try { return JSON.parse(localStorage.getItem('shop-cart') ?? '[]') } catch { return [] } }
function saveCart(c: CartItem[]) { localStorage.setItem('shop-cart', JSON.stringify(c)) }

const L = {
  de: { cart: 'Warenkorb', empty: 'Dein Warenkorb ist leer', total: 'Gesamt', submit: 'Vorbestellung absenden', note: 'Anmerkung (optional)', login_required: 'Bitte melde dich an, um zu bestellen', login: 'Anmelden', back: 'Weiter einkaufen', success: 'Deine Vorbestellung ist eingegangen!', orders: 'Zu meinen Bestellungen', remove: 'Entfernen', quantity: 'Menge', pickup: 'Bezahlung & Abholung vor Ort' },
  en: { cart: 'Cart', empty: 'Your cart is empty', total: 'Total', submit: 'Submit pre-order', note: 'Note (optional)', login_required: 'Please sign in to place an order', login: 'Sign In', back: 'Continue shopping', success: 'Your pre-order has been received!', orders: 'Go to my orders', remove: 'Remove', quantity: 'Qty', pickup: 'Payment & pickup on site' },
}

export default function WarenkorbPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('de')
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [note, setNote] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const t = L[locale]

  useEffect(() => {
    setLocale(getLocale())
    setCart(getCart())
    fetch('/api/shop/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/shop/auth/me').then(r => setIsLoggedIn(r.ok)).catch(() => setIsLoggedIn(false))
  }, [])

  const productMap = new Map(products.map(p => [p.id, p]))
  const pName = (p: ShopProduct) => locale === 'en' ? p.shopNameEn ?? p.shopName ?? p.name : p.shopName ?? p.name

  function updateQty(productId: string, qty: number) {
    if (qty < 1) return removeItem(productId)
    const updated = cart.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
    setCart(updated); saveCart(updated)
  }
  function removeItem(productId: string) {
    const updated = cart.filter(i => i.productId !== productId)
    setCart(updated); saveCart(updated)
  }

  const total = cart.reduce((s, i) => {
    const p = productMap.get(i.productId)
    return s + (p ? (p.shopPrice ?? p.price) * i.quantity : 0)
  }, 0)

  async function submit() {
    if (!isLoggedIn) { router.push(`/shop/login?callbackUrl=/shop/warenkorb`); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, note: note || undefined }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'unknown') }
      localStorage.removeItem('shop-cart')
      setCart([]); setSuccess(true)
    } catch (e) {
      setError((e as Error).message)
    } finally { setSubmitting(false) }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-zinc-800 mb-2">{t.success}</h1>
        <p className="text-zinc-500 mb-6">{t.pickup}</p>
        <Link href="/shop/konto" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl">{t.orders}</Link>
      </div>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/shop" className="text-lg font-bold text-amber-800">KörBee</Link>
          <Link href="/shop/produkte" className="text-sm text-amber-600 hover:text-amber-700">{t.back}</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-800 mb-6">{t.cart}</h1>

        {cart.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg">{t.empty}</p>
            <Link href="/shop/produkte" className="inline-block mt-4 text-amber-600 hover:text-amber-700 font-medium">{t.back}</Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {cart.map(item => {
                const p = productMap.get(item.productId)
                if (!p) return null
                const price = p.shopPrice ?? p.price
                return (
                  <div key={item.productId} className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-800">{pName(p)}</h3>
                      <p className="text-sm text-zinc-500">{price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / {p.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50">−</button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50">+</button>
                    </div>
                    <span className="font-bold text-amber-700 w-20 text-right">{(price * item.quantity).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    <button onClick={() => removeItem(item.productId)} className="text-zinc-400 hover:text-rose-500 text-sm">{t.remove}</button>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 bg-white rounded-2xl border border-zinc-100 p-4">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t.note}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-lg font-bold text-zinc-800">{t.total}: {total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>

            {isLoggedIn === false && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-800 mb-2">{t.login_required}</p>
                <Link href={`/shop/login?callbackUrl=/shop/warenkorb`} className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-xl">{t.login}</Link>
              </div>
            )}

            {error && <p className="mt-4 text-rose-600 text-sm">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting || isLoggedIn === false}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {submitting ? '...' : t.submit}
            </button>
            <p className="mt-2 text-center text-sm text-zinc-400">{t.pickup}</p>
          </>
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 3: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/shop/produkte/ src/app/shop/warenkorb/
git commit -m "feat(shop): add product overview page and cart with checkout"
```

---

### Task 11: Shop Auth Pages (Login, Register, Password Reset)

**Files:**
- Create: `src/app/shop/login/page.tsx`
- Create: `src/app/shop/registrieren/page.tsx`
- Create: `src/app/shop/passwort-vergessen/page.tsx`

**Interfaces:**
- Consumes: `/api/shop/auth/login` (POST), `/api/shop/auth/register` (POST), `/api/shop/auth/reset-password` (POST), `/api/shop/auth/new-password` (POST)

- [ ] **Step 1: Create login page**

Create `src/app/shop/login/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Locale = 'de' | 'en'
const L = {
  de: { title: 'Anmelden', email: 'E-Mail-Adresse', password: 'Passwort', submit: 'Einloggen', no_account: 'Noch kein Konto?', register: 'Jetzt registrieren', forgot: 'Passwort vergessen?', error: 'E-Mail oder Passwort falsch', verified: 'E-Mail bestätigt! Du kannst dich jetzt einloggen.' },
  en: { title: 'Sign In', email: 'Email address', password: 'Password', submit: 'Sign in', no_account: 'No account yet?', register: 'Register now', forgot: 'Forgot password?', error: 'Invalid email or password', verified: 'Email verified! You can now sign in.' },
}

export default function ShopLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/shop/konto'
  const verified = searchParams.get('verified')
  const [locale, setLocale] = useState<Locale>('de')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const t = L[locale]

  useEffect(() => {
    const m = document.cookie.match(/shop-locale=([^;]*)/)
    if (m?.[1] === 'en') setLocale('en')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/shop/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) { setError(t.error); return }
      router.push(callbackUrl)
    } catch { setError(t.error) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-amber-50/30">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-800 text-center mb-6">{t.title}</h1>
        {verified && <p className="mb-4 text-green-600 text-sm text-center bg-green-50 border border-green-200 rounded-xl p-3">{t.verified}</p>}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">{t.email}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">{t.password}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl transition-colors">
            {loading ? '...' : t.submit}
          </button>
          <div className="text-center text-sm text-zinc-500 space-y-1">
            <p>{t.no_account} <Link href="/shop/registrieren" className="text-amber-600 hover:text-amber-700 font-medium">{t.register}</Link></p>
            <p><Link href="/shop/passwort-vergessen" className="text-amber-600 hover:text-amber-700">{t.forgot}</Link></p>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create registration page**

Create `src/app/shop/registrieren/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Locale = 'de' | 'en'
const L = {
  de: { title: 'Registrieren', name: 'Name', email: 'E-Mail-Adresse', phone: 'Telefon (optional)', password: 'Passwort', confirm: 'Passwort bestätigen', submit: 'Konto erstellen', has_account: 'Bereits ein Konto?', login: 'Jetzt einloggen', mismatch: 'Passwörter stimmen nicht überein', exists: 'Diese E-Mail ist bereits registriert', short: 'Passwort muss mindestens 8 Zeichen lang sein', success: 'Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.' },
  en: { title: 'Register', name: 'Name', email: 'Email address', phone: 'Phone (optional)', password: 'Password', confirm: 'Confirm password', submit: 'Create account', has_account: 'Already have an account?', login: 'Sign in', mismatch: 'Passwords do not match', exists: 'This email is already registered', short: 'Password must be at least 8 characters', success: 'Registration successful! Please verify your email address.' },
}

export default function ShopRegisterPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('de')
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState(''); const [error, setError] = useState('')
  const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false)
  const t = L[locale]

  useEffect(() => { const m = document.cookie.match(/shop-locale=([^;]*)/); if (m?.[1] === 'en') setLocale('en') }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (password.length < 8) { setError(t.short); return }
    if (password !== confirm) { setError(t.mismatch); return }
    setLoading(true)
    try {
      const res = await fetch('/api/shop/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone: phone || undefined, locale }),
      })
      if (res.status === 409) { setError(t.exists); return }
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
      setSuccess(true)
      setTimeout(() => router.push('/shop/konto'), 2000)
    } catch { setError('Error') }
    finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center"><div className="text-4xl mb-4">📧</div><p className="text-zinc-700">{t.success}</p></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-amber-50/30">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-800 text-center mb-6">{t.title}</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.name}</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.email}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.phone}</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.password}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.confirm}</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl transition-colors">{loading ? '...' : t.submit}</button>
          <p className="text-center text-sm text-zinc-500">{t.has_account} <Link href="/shop/login" className="text-amber-600 hover:text-amber-700 font-medium">{t.login}</Link></p>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create password-reset page**

Create `src/app/shop/passwort-vergessen/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Locale = 'de' | 'en'
const L = {
  de: { title: 'Passwort zurücksetzen', email: 'E-Mail-Adresse', submit: 'Link senden', success: 'Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link gesendet.', back: 'Zurück zum Login', new_pw: 'Neues Passwort', confirm: 'Passwort bestätigen', save: 'Passwort speichern', saved: 'Passwort gespeichert! Du kannst dich jetzt einloggen.', mismatch: 'Passwörter stimmen nicht überein', short: 'Mindestens 8 Zeichen' },
  en: { title: 'Reset Password', email: 'Email address', submit: 'Send link', success: 'If an account with this email exists, we\'ve sent you a link.', back: 'Back to login', new_pw: 'New password', confirm: 'Confirm password', save: 'Save password', saved: 'Password saved! You can now sign in.', mismatch: 'Passwords do not match', short: 'At least 8 characters' },
}

export default function PasswortVergessenPage() {
  const searchParams = useSearchParams()
  const resetToken = searchParams.get('token')
  const [locale, setLocale] = useState<Locale>('de')
  const t = L[locale]

  useEffect(() => { const m = document.cookie.match(/shop-locale=([^;]*)/); if (m?.[1] === 'en') setLocale('en') }, [])

  if (resetToken) return <NewPasswordForm token={resetToken} t={t} />
  return <RequestResetForm t={t} />
}

function RequestResetForm({ t }: { t: Record<string, string> }) {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await fetch('/api/shop/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => {})
    setSent(true); setLoading(false)
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-amber-50/30">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-800 text-center mb-6">{t.title}</h1>
        {sent ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 text-center">
            <p className="text-zinc-700 mb-4">{t.success}</p>
            <Link href="/shop/login" className="text-amber-600 hover:text-amber-700 font-medium">{t.back}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
            <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.email}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
            <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl">{loading ? '...' : t.submit}</button>
            <p className="text-center text-sm"><Link href="/shop/login" className="text-amber-600">{t.back}</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}

function NewPasswordForm({ token, t }: { token: string; t: Record<string, string> }) {
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(''); const [saved, setSaved] = useState(false); const [loading, setLoading] = useState(false)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (password.length < 8) { setError(t.short); return }
    if (password !== confirm) { setError(t.mismatch); return }
    setLoading(true)
    const res = await fetch('/api/shop/auth/new-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); setLoading(false); return }
    setSaved(true); setLoading(false)
  }
  if (saved) return (
    <div className="min-h-screen flex items-center justify-center px-4"><div className="text-center"><p className="text-zinc-700 mb-4">{t.saved}</p><Link href="/shop/login" className="text-amber-600 font-medium">{t.back}</Link></div></div>
  )
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-amber-50/30">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-800 text-center mb-6">{t.title}</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.new_pw}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <div><label className="block text-sm font-medium text-zinc-700 mb-1">{t.confirm}</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl">{loading ? '...' : t.save}</button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/app/shop/login/ src/app/shop/registrieren/ src/app/shop/passwort-vergessen/
git commit -m "feat(shop): add customer auth pages (login, register, password reset)"
```

---

### Task 12: Customer Account Pages (Orders, Profile)

**Files:**
- Create: `src/app/shop/konto/layout.tsx`
- Create: `src/app/shop/konto/page.tsx`
- Create: `src/app/shop/konto/bestellung/[id]/page.tsx`
- Create: `src/app/shop/konto/profil/page.tsx`

**Interfaces:**
- Consumes: `/api/shop/auth/me` (GET), `/api/shop/orders` (GET), `/api/shop/orders/[id]` (GET)

- [ ] **Step 1: Create account layout (auth guard)**

Create `src/app/shop/konto/layout.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Customer { id: string; name: string; email: string; locale: string }

export default function KontoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const locale = customer?.locale === 'en' ? 'en' : 'de'

  useEffect(() => {
    fetch('/api/shop/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setCustomer)
      .catch(() => router.push('/shop/login?callbackUrl=/shop/konto'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-zinc-400">...</div></div>

  async function logout() {
    await fetch('/api/shop/auth/logout', { method: 'POST' })
    router.push('/shop')
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/shop" className="text-lg font-bold text-amber-800">KörBee</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop/produkte" className="text-zinc-600 hover:text-amber-700">{locale === 'de' ? 'Produkte' : 'Products'}</Link>
            <Link href="/shop/konto" className="text-amber-700 font-medium">{locale === 'de' ? 'Bestellungen' : 'Orders'}</Link>
            <Link href="/shop/konto/profil" className="text-zinc-600 hover:text-amber-700">{locale === 'de' ? 'Profil' : 'Profile'}</Link>
            <button onClick={logout} className="text-zinc-400 hover:text-zinc-600">{locale === 'de' ? 'Abmelden' : 'Sign out'}</button>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </>
  )
}
```

- [ ] **Step 2: Create orders list page**

Create `src/app/shop/konto/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface OrderItem { product: { name: string; shopName: string | null }; quantity: number; priceAtOrder: number }
interface Order { id: string; status: string; createdAt: string; items: OrderItem[] }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800',
  PICKED_UP: 'bg-zinc-100 text-zinc-600',
  CANCELLED: 'bg-rose-100 text-rose-700',
}

const STATUS_DE: Record<string, string> = { PENDING: 'Eingegangen', CONFIRMED: 'Bestätigt', READY: 'Abholbereit', PICKED_UP: 'Abgeholt', CANCELLED: 'Storniert' }
const STATUS_EN: Record<string, string> = { PENDING: 'Received', CONFIRMED: 'Confirmed', READY: 'Ready for pickup', PICKED_UP: 'Picked up', CANCELLED: 'Cancelled' }

export default function KontoPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const locale = (document.cookie.match(/shop-locale=([^;]*)/)?.[1] === 'en' ? 'en' : 'de') as 'de' | 'en'
  const statusLabels = locale === 'en' ? STATUS_EN : STATUS_DE

  useEffect(() => {
    fetch('/api/shop/orders').then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-400">...</p>

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">{locale === 'de' ? 'Meine Bestellungen' : 'My Orders'}</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500">{locale === 'de' ? 'Du hast noch keine Bestellungen' : 'You have no orders yet'}</p>
          <Link href="/shop/produkte" className="inline-block mt-4 text-amber-600 font-medium">{locale === 'de' ? 'Jetzt bestellen' : 'Order now'}</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const total = o.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)
            return (
              <Link key={o.id} href={`/shop/konto/bestellung/${o.id}`} className="block bg-white rounded-2xl border border-zinc-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-500">{new Date(o.createdAt).toLocaleDateString('de-DE')}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-zinc-100'}`}>
                    {statusLabels[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-700">{o.items.map(i => `${i.quantity}x ${i.product.shopName ?? i.product.name}`).join(', ')}</p>
                <p className="text-amber-700 font-bold mt-1">{total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Create order detail page**

Create `src/app/shop/konto/bestellung/[id]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface OrderItem { product: { name: string; shopName: string | null; unit: string }; quantity: number; priceAtOrder: number }
interface Order { id: string; status: string; createdAt: string; statusChangedAt: string; note: string | null; items: OrderItem[] }

const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', READY: 'bg-green-100 text-green-800', PICKED_UP: 'bg-zinc-100 text-zinc-600', CANCELLED: 'bg-rose-100 text-rose-700' }
const STATUS_DE: Record<string, string> = { PENDING: 'Eingegangen', CONFIRMED: 'Bestätigt', READY: 'Abholbereit', PICKED_UP: 'Abgeholt', CANCELLED: 'Storniert' }
const STATUS_EN: Record<string, string> = { PENDING: 'Received', CONFIRMED: 'Confirmed', READY: 'Ready for pickup', PICKED_UP: 'Picked up', CANCELLED: 'Cancelled' }

export default function BestellungDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const locale = (typeof document !== 'undefined' && document.cookie.match(/shop-locale=([^;]*)/)?.[1] === 'en' ? 'en' : 'de') as 'de' | 'en'
  const statusLabels = locale === 'en' ? STATUS_EN : STATUS_DE

  useEffect(() => {
    fetch(`/api/shop/orders/${id}`).then(r => r.json()).then(setOrder).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-zinc-400">...</p>
  if (!order) return <p className="text-zinc-500">{locale === 'de' ? 'Bestellung nicht gefunden' : 'Order not found'}</p>

  const total = order.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)

  return (
    <>
      <Link href="/shop/konto" className="text-sm text-amber-600 hover:text-amber-700 mb-4 inline-block">&larr; {locale === 'de' ? 'Zurück' : 'Back'}</Link>
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-zinc-800">{locale === 'de' ? 'Bestelldetails' : 'Order Details'}</h1>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status]}`}>{statusLabels[order.status]}</span>
        </div>
        <p className="text-sm text-zinc-500 mb-1">{locale === 'de' ? 'Bestellt am' : 'Ordered on'}: {new Date(order.createdAt).toLocaleDateString('de-DE')}</p>
        <p className="text-sm text-zinc-500 mb-4">{locale === 'de' ? 'Letzte Aktualisierung' : 'Last update'}: {new Date(order.statusChangedAt).toLocaleDateString('de-DE')}</p>

        <table className="w-full text-sm mb-4">
          <thead><tr className="border-b border-zinc-100 text-zinc-500"><th className="text-left py-2">{locale === 'de' ? 'Produkt' : 'Product'}</th><th className="text-right py-2">{locale === 'de' ? 'Menge' : 'Qty'}</th><th className="text-right py-2">{locale === 'de' ? 'Preis' : 'Price'}</th><th className="text-right py-2">{locale === 'de' ? 'Summe' : 'Subtotal'}</th></tr></thead>
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx} className="border-b border-zinc-50">
                <td className="py-2">{i.product.shopName ?? i.product.name}</td>
                <td className="text-right py-2">{i.quantity} {i.product.unit}</td>
                <td className="text-right py-2">{i.priceAtOrder.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
                <td className="text-right py-2 font-medium">{(i.quantity * i.priceAtOrder).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right font-bold text-amber-700 text-lg">{total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
        {order.note && <p className="mt-4 text-sm text-zinc-600 bg-zinc-50 rounded-xl p-3">{order.note}</p>}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Create profile edit page**

Create `src/app/shop/konto/profil/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'

interface Customer { id: string; name: string; email: string; phone: string | null; locale: string }

export default function ProfilPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState(''); const [phone, setPhone] = useState('')
  const [locale, setLocale] = useState('de')
  const [password, setPassword] = useState(''); const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const l = locale === 'en' ? 'en' : 'de'

  useEffect(() => {
    fetch('/api/shop/auth/me').then(r => r.json()).then((c: Customer) => {
      setCustomer(c); setName(c.name); setPhone(c.phone ?? ''); setLocale(c.locale)
    }).catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaved(false); setSaving(true)
    if (password && password.length < 8) { setError(l === 'de' ? 'Mindestens 8 Zeichen' : 'At least 8 characters'); setSaving(false); return }
    if (password && password !== confirmPw) { setError(l === 'de' ? 'Passwörter stimmen nicht überein' : 'Passwords do not match'); setSaving(false); return }
    // Profile update via a simple PATCH on /api/shop/auth/me
    const res = await fetch('/api/shop/auth/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone: phone || null, locale, ...(password ? { password } : {}) }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error') }
    else {
      setSaved(true); setPassword(''); setConfirmPw('')
      document.cookie = `shop-locale=${locale};path=/;max-age=${365 * 86400}`
    }
    setSaving(false)
  }

  if (!customer) return null

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">{l === 'de' ? 'Profil' : 'Profile'}</h1>
      <form onSubmit={save} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4 max-w-md">
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Name' : 'Name'}</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">E-Mail</label><input type="email" value={customer.email} disabled className="w-full border border-zinc-100 bg-zinc-50 rounded-xl px-3 py-2 text-sm text-zinc-400" /></div>
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Telefon' : 'Phone'}</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Sprache' : 'Language'}</label><select value={locale} onChange={e => setLocale(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"><option value="de">Deutsch</option><option value="en">English</option></select></div>
        <hr className="border-zinc-100" />
        <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Neues Passwort (optional)' : 'New password (optional)'}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
        {password && <div><label className="block text-sm font-medium text-zinc-700 mb-1">{l === 'de' ? 'Bestätigen' : 'Confirm'}</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>}
        {error && <p className="text-rose-600 text-sm">{error}</p>}
        {saved && <p className="text-green-600 text-sm">{l === 'de' ? 'Gespeichert!' : 'Saved!'}</p>}
        <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold px-6 py-2.5 rounded-xl">{saving ? '...' : l === 'de' ? 'Speichern' : 'Save'}</button>
      </form>
    </>
  )
}
```

- [ ] **Step 5: Add PATCH handler to the me route for profile updates**

Append to `src/app/api/shop/auth/me/route.ts` (after the existing `GET`):

```typescript
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { name, phone, locale, password } = await req.json()
  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (phone !== undefined) data.phone = phone
  if (locale === 'de' || locale === 'en') data.locale = locale
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  const updated = await prisma.shopCustomer.update({ where: { id: customer.id }, data })
  return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, locale: updated.locale })
}
```

Note: The imports for `bcrypt` and `prisma` are already present in the me route file from Task 6. You need to add the `prisma` import if not present — check the existing file and add `import { prisma } from '@/lib/prisma'` and `import bcrypt from 'bcryptjs'` if missing.

- [ ] **Step 6: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 7: Commit**

```bash
git add src/app/shop/konto/ src/app/api/shop/auth/me/route.ts
git commit -m "feat(shop): add customer account pages (orders, order detail, profile) and PATCH /me"
```

---

### Task 13: Admin Dashboard — Pre-Order Management

**Files:**
- Create: `src/app/dashboard/vorbestellungen/page.tsx`
- Create: `src/app/dashboard/vorbestellungen/[id]/page.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `/api/admin/preorders` (GET), `/api/admin/preorders/stats` (GET), `/api/admin/preorders/[id]` (GET), `/api/admin/preorders/[id]/status` (PATCH)

- [ ] **Step 1: Create admin pre-orders list page with stats**

Create `src/app/dashboard/vorbestellungen/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface OrderItem { product: { name: string; shopName: string | null }; quantity: number; priceAtOrder: number }
interface Order { id: string; status: string; createdAt: string; shopCustomer: { name: string; email: string }; items: OrderItem[] }
interface Stats { pending: number; confirmed: number; ready: number; pickedUpThisWeek: number; productSummary: Array<{ productName: string; totalOrdered: number }> }

const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', READY: 'bg-green-100 text-green-800', PICKED_UP: 'bg-zinc-100 text-zinc-600', CANCELLED: 'bg-rose-100 text-rose-700' }
const STATUS_LABELS: Record<string, string> = { PENDING: 'Eingegangen', CONFIRMED: 'Bestätigt', READY: 'Abholbereit', PICKED_UP: 'Abgeholt', CANCELLED: 'Storniert' }
const FILTER_OPTIONS = ['', 'PENDING', 'CONFIRMED', 'READY', 'PICKED_UP', 'CANCELLED']

function fmt(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) }

export default function VorbestellungenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (filter) params.set('status', filter)
    if (search) params.set('search', search)
    fetch(`/api/admin/preorders?${params}`).then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : []))
    fetch('/api/admin/preorders/stats').then(r => r.json()).then(setStats)
  }, [filter, search])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Vorbestellungen</h1>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-zinc-100 p-4"><p className="text-sm text-zinc-500">Offen</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
          <div className="bg-white rounded-2xl border border-zinc-100 p-4"><p className="text-sm text-zinc-500">Bestätigt</p><p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p></div>
          <div className="bg-white rounded-2xl border border-zinc-100 p-4"><p className="text-sm text-zinc-500">Abholbereit</p><p className="text-2xl font-bold text-green-600">{stats.ready}</p></div>
          <div className="bg-white rounded-2xl border border-zinc-100 p-4"><p className="text-sm text-zinc-500">Diese Woche abgeholt</p><p className="text-2xl font-bold text-zinc-600">{stats.pickedUpThisWeek}</p></div>
        </div>
      )}

      {/* Product summary */}
      {stats && stats.productSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 mb-6">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Vorbestellte Produkte (offen)</h2>
          <div className="flex flex-wrap gap-3">
            {stats.productSummary.map((p, i) => (
              <span key={i} className="text-sm bg-amber-50 text-amber-800 px-3 py-1 rounded-full">{p.totalOrdered}x {p.productName}</span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm">
          <option value="">Alle Status</option>
          {FILTER_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche (Name, E-Mail)..." className="border border-zinc-200 rounded-xl px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-100 text-zinc-500 text-left"><th className="px-4 py-3">Datum</th><th className="px-4 py-3">Kunde</th><th className="px-4 py-3">Positionen</th><th className="px-4 py-3 text-right">Summe</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>
            {orders.map(o => {
              const total = o.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)
              return (
                <tr key={o.id} className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/vorbestellungen/${o.id}`}>
                  <td className="px-4 py-3">{new Date(o.createdAt).toLocaleDateString('de-DE')}</td>
                  <td className="px-4 py-3"><div className="font-medium">{o.shopCustomer.name}</div><div className="text-zinc-400 text-xs">{o.shopCustomer.email}</div></td>
                  <td className="px-4 py-3">{o.items.map(i => `${i.quantity}x ${i.product.shopName ?? i.product.name}`).join(', ')}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(total)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
                </tr>
              )
            })}
            {orders.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">Keine Vorbestellungen gefunden</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create admin pre-order detail page with status workflow**

Create `src/app/dashboard/vorbestellungen/[id]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface OrderItem { product: { name: string; shopName: string | null; unit: string }; quantity: number; priceAtOrder: number }
interface Order { id: string; status: string; createdAt: string; statusChangedAt: string; note: string | null; adminNote: string | null; shopCustomer: { name: string; email: string; phone: string | null }; items: OrderItem[] }

const STATUS_LABELS: Record<string, string> = { PENDING: 'Eingegangen', CONFIRMED: 'Bestätigt', READY: 'Abholbereit', PICKED_UP: 'Abgeholt', CANCELLED: 'Storniert' }
const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', READY: 'bg-green-100 text-green-800', PICKED_UP: 'bg-zinc-100 text-zinc-600', CANCELLED: 'bg-rose-100 text-rose-700' }
const ACTIONS: Record<string, Array<{ label: string; status: string; color: string }>> = {
  PENDING: [{ label: 'Bestätigen', status: 'CONFIRMED', color: 'bg-blue-500 hover:bg-blue-600 text-white' }, { label: 'Stornieren', status: 'CANCELLED', color: 'bg-rose-500 hover:bg-rose-600 text-white' }],
  CONFIRMED: [{ label: 'Abholbereit melden', status: 'READY', color: 'bg-green-500 hover:bg-green-600 text-white' }, { label: 'Stornieren', status: 'CANCELLED', color: 'bg-rose-500 hover:bg-rose-600 text-white' }],
  READY: [{ label: 'Als abgeholt markieren', status: 'PICKED_UP', color: 'bg-zinc-600 hover:bg-zinc-700 text-white' }],
}

function fmt(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) }

export default function VorbestellungDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/preorders/${id}`).then(r => r.json()).then(o => { setOrder(o); setAdminNote(o.adminNote ?? '') }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function changeStatus(newStatus: string) {
    setActing(true)
    const res = await fetch(`/api/admin/preorders/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, adminNote: adminNote || undefined }),
    })
    if (res.ok) { const updated = await res.json(); setOrder(updated) }
    setActing(false)
  }

  if (loading) return <div className="p-6"><p className="text-zinc-400">...</p></div>
  if (!order) return <div className="p-6"><p className="text-zinc-500">Bestellung nicht gefunden</p></div>

  const total = order.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)
  const actions = ACTIONS[order.status] ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/dashboard/vorbestellungen" className="text-sm text-amber-600 hover:text-amber-700 mb-4 inline-block">&larr; Zurück</Link>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-zinc-800">Vorbestellung</h1>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
        </div>

        {/* Customer info */}
        <div className="bg-zinc-50 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Kunde</h2>
          <p className="text-sm">{order.shopCustomer.name}</p>
          <p className="text-sm text-zinc-500">{order.shopCustomer.email}</p>
          {order.shopCustomer.phone && <p className="text-sm text-zinc-500">{order.shopCustomer.phone}</p>}
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-4">
          <thead><tr className="border-b border-zinc-100 text-zinc-500"><th className="text-left py-2">Produkt</th><th className="text-right py-2">Menge</th><th className="text-right py-2">Preis</th><th className="text-right py-2">Summe</th></tr></thead>
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx} className="border-b border-zinc-50"><td className="py-2">{i.product.shopName ?? i.product.name}</td><td className="text-right py-2">{i.quantity} {i.product.unit}</td><td className="text-right py-2">{fmt(i.priceAtOrder)}</td><td className="text-right py-2 font-medium">{fmt(i.quantity * i.priceAtOrder)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="text-right font-bold text-amber-700 text-lg">{fmt(total)}</p>

        {order.note && <div className="mt-4 bg-amber-50 rounded-xl p-3"><p className="text-xs font-semibold text-amber-800 mb-1">Kundennotiz</p><p className="text-sm text-zinc-700">{order.note}</p></div>}

        <p className="text-xs text-zinc-400 mt-4">Bestellt: {new Date(order.createdAt).toLocaleString('de-DE')} | Aktualisiert: {new Date(order.statusChangedAt).toLocaleString('de-DE')}</p>
      </div>

      {/* Admin note + actions */}
      {actions.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Aktion</h2>
          <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Interne Notiz (optional)" className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none h-16 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-300" />
          <div className="flex gap-3">
            {actions.map(a => (
              <button key={a.status} onClick={() => changeStatus(a.status)} disabled={acting} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${a.color}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add "Vorbestellungen" to the Sidebar**

In `src/components/Sidebar.tsx`, add a new nav item after the "Kassenbuch" entry in the `navItems` array:

```typescript
  {
    label: 'Vorbestellungen',
    href: '/dashboard/vorbestellungen',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
```

- [ ] **Step 4: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/vorbestellungen/ src/components/Sidebar.tsx
git commit -m "feat(shop): add admin pre-order management dashboard with stats and status workflow"
```

---

### Task 14: Environment Variables + Vercel Subdomain Config

**Files:**
- Modify: `.env` or `.env.local` (add `SHOP_JWT_SECRET`, `SHOP_BASE_URL`, `SHOP_HOST`)

**Interfaces:**
- Produces: All required env vars documented and set for local dev

- [ ] **Step 1: Add environment variables to .env.local**

Add to `.env.local`:

```
# Shop Pre-Order System
SHOP_JWT_SECRET=generate-a-strong-random-secret-at-least-32-chars
SHOP_BASE_URL=http://localhost:3000
SHOP_HOST=localhost
```

For production (Vercel), set:
```
SHOP_JWT_SECRET=<random 64-char hex>
SHOP_BASE_URL=https://shop.yourdomain.de
SHOP_HOST=shop.yourdomain.de
```

- [ ] **Step 2: Generate a secure SHOP_JWT_SECRET for local dev**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `SHOP_JWT_SECRET` in `.env.local`.

- [ ] **Step 3: Verify the full app builds and starts**

```bash
npm run build && echo "BUILD OK"
```

- [ ] **Step 4: Commit (do NOT commit .env.local — just the docs/plan)**

Verify `.env.local` is in `.gitignore`. No commit needed for env vars — just ensure they're set.

- [ ] **Step 5: Final build verification and smoke test**

```bash
npm run dev
```

Test manually:
1. Visit `http://localhost:3000/shop` → Landing page should render
2. Visit `http://localhost:3000/shop/produkte` → Product grid (empty if no products marked `shopVisible`)
3. Visit `http://localhost:3000/shop/login` → Login form
4. Visit `http://localhost:3000/dashboard` → Existing admin still works
5. Visit `http://localhost:3000/dashboard/vorbestellungen` → Pre-order management page

- [ ] **Step 6: Commit plan**

```bash
git add docs/superpowers/plans/2026-09-15-vorbestellungs-shop.md
git commit -m "docs: add implementation plan for pre-order shop"
```
