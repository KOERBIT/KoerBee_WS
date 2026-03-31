# Bienenverwaltungs-Plattform MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Next.js-basierte Bienenhaltungs-PWA mit Kern-Datenverwaltung (Völker, Standorte, Stockkarten) und NFC/RFID-Integration aufbauen.

**Architecture:** Next.js App Router mit TypeScript, Prisma ORM auf PostgreSQL (Supabase), NextAuth für Auth. Offline-Fähigkeit via next-pwa Service Worker und IndexedDB für lokale Datenpufferung. NFC-Scan über Web NFC API (Chrome/Android), QR-Code als iOS-Fallback.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL (Supabase), NextAuth.js, next-pwa, Tailwind CSS, Leaflet.js, IndexedDB (idb), Jest, React Testing Library

---

## Dateistruktur

```
/
├── prisma/
│   └── schema.prisma                        # Datenbank-Schema
├── src/
│   ├── app/
│   │   ├── layout.tsx                       # Root layout (PWA meta, fonts)
│   │   ├── page.tsx                         # Landingpage
│   │   ├── login/page.tsx                   # Login-Seite
│   │   ├── register/page.tsx                # Registrierung
│   │   ├── (app)/                           # Authentifizierte App-Bereich
│   │   │   ├── layout.tsx                   # App-Layout mit Nav
│   │   │   ├── dashboard/page.tsx           # Dashboard
│   │   │   ├── apiaries/
│   │   │   │   ├── page.tsx                 # Standort-Liste + Karte
│   │   │   │   └── [id]/page.tsx            # Standort-Detail
│   │   │   ├── colonies/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx             # Volk-Detail + Stockkarte
│   │   │   │       └── inspect/page.tsx     # Neue Inspektion
│   │   │   └── nfc/
│   │   │       ├── scan/page.tsx            # NFC-Scanner
│   │   │       └── manage/page.tsx          # NFC-Tags verwalten
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │       ├── apiaries/
│   │       │   ├── route.ts                 # GET list, POST create
│   │       │   └── [id]/route.ts            # GET, PUT, DELETE
│   │       ├── colonies/
│   │       │   ├── route.ts                 # GET list, POST create
│   │       │   └── [id]/route.ts            # GET, PUT, DELETE
│   │       ├── inspections/
│   │       │   ├── route.ts                 # POST create
│   │       │   └── [id]/route.ts            # GET, DELETE
│   │       └── nfc/
│   │           ├── route.ts                 # GET tags, POST create tag
│   │           └── [uid]/route.ts           # GET tag by UID (für Scan-Lookup)
│   ├── lib/
│   │   ├── prisma.ts                        # Prisma-Client Singleton
│   │   ├── auth.ts                          # NextAuth-Konfiguration
│   │   └── offline-db.ts                   # IndexedDB-Wrapper (idb)
│   └── components/
│       ├── ui/
│       │   ├── Button.tsx
│       │   ├── Input.tsx
│       │   └── Card.tsx
│       ├── apiaries/
│       │   ├── ApiaryCard.tsx
│       │   └── ApiaryMap.tsx               # Leaflet-Karte
│       ├── colonies/
│       │   ├── ColonyCard.tsx
│       │   └── InspectionForm.tsx
│       └── nfc/
│           ├── NfcScanner.tsx
│           └── NfcTagList.tsx
├── public/
│   ├── manifest.json                        # PWA-Manifest
│   └── icons/                              # PWA-Icons (192x192, 512x512)
├── next.config.js                           # next-pwa Konfiguration
└── jest.config.ts
```

---

## Task 1: Projekt-Setup

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `jest.config.ts`, `.env.local`

- [ ] **Step 1: Next.js-Projekt initialisieren**

```bash
cd C:/Users/koerbe/PycharmProjects/Bee
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: Projekt-Dateien werden erstellt.

- [ ] **Step 2: Abhängigkeiten installieren**

```bash
npm install @prisma/client next-auth @next-auth/prisma-adapter
npm install leaflet react-leaflet
npm install idb
npm install next-pwa
npm install --save-dev prisma @types/leaflet jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-jest
```

- [ ] **Step 3: Jest konfigurieren**

Inhalt von `jest.config.ts`:
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

Inhalt von `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: `.env.local` anlegen**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXTAUTH_SECRET="dev-secret-bitte-aendern"
NEXTAUTH_URL="http://localhost:3000"
EOF
```

Supabase-Datenbankverbindungs-URL einsetzen (aus Supabase Dashboard → Settings → Database → Connection String).

- [ ] **Step 5: Git initialisieren und committen**

```bash
git init
git add .
git commit -m "chore: Next.js Projekt-Setup mit TypeScript, Tailwind, Jest"
```

---

## Task 2: Prisma Schema & Datenbank

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `src/__tests__/lib/prisma.test.ts`

- [ ] **Step 1: Prisma initialisieren**

```bash
npx prisma init
```

- [ ] **Step 2: Schema schreiben**

Inhalt von `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  plan          String    @default("hobby")
  createdAt     DateTime  @default(now())
  apiaries      Apiary[]
  accounts      Account[]
  sessions      Session[]
}

model Apiary {
  id        String    @id @default(cuid())
  name      String
  lat       Float?
  lng       Float?
  notes     String?
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  colonies  Colony[]
  createdAt DateTime  @default(now())
}

model Colony {
  id          String       @id @default(cuid())
  name        String
  queenYear   Int?
  queenColor  String?
  apiaryId    String
  apiary      Apiary       @relation(fields: [apiaryId], references: [id], onDelete: Cascade)
  inspections Inspection[]
  treatments  Treatment[]
  nfcTags     NfcTag[]
  createdAt   DateTime     @default(now())
}

model Inspection {
  id             String           @id @default(cuid())
  date           DateTime         @default(now())
  notes          String?
  createdOffline Boolean          @default(false)
  colonyId       String
  colony         Colony           @relation(fields: [colonyId], references: [id], onDelete: Cascade)
  items          InspectionItem[]
  createdAt      DateTime         @default(now())
}

model InspectionItem {
  id           String     @id @default(cuid())
  key          String
  value        String
  inspectionId String
  inspection   Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
}

model Treatment {
  id        String   @id @default(cuid())
  type      String   // feeding | varroa | other
  amount    Float?
  unit      String?
  date      DateTime @default(now())
  notes     String?
  colonyId  String
  colony    Colony   @relation(fields: [colonyId], references: [id], onDelete: Cascade)
}

model NfcTag {
  id        String      @id @default(cuid())
  uid       String      @unique
  label     String?
  colonyId  String
  colony    Colony      @relation(fields: [colonyId], references: [id], onDelete: Cascade)
  actions   NfcAction[]
  createdAt DateTime    @default(now())
}

model NfcAction {
  id            String  @id @default(cuid())
  type          String  // inspection | feeding | treatment
  defaultValues Json?
  nfcTagId      String
  nfcTag        NfcTag  @relation(fields: [nfcTagId], references: [id], onDelete: Cascade)
}

// NextAuth required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

- [ ] **Step 3: Migration ausführen**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: `prisma/migrations/` Ordner erstellt, Prisma Client generiert.

- [ ] **Step 4: Prisma-Singleton schreiben**

Inhalt von `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Smoke-Test schreiben**

Inhalt von `src/__tests__/lib/prisma.test.ts`:
```typescript
import { prisma } from '@/lib/prisma'

describe('Prisma Client', () => {
  it('should export a PrismaClient instance', () => {
    expect(prisma).toBeDefined()
    expect(typeof prisma.user.findMany).toBe('function')
    expect(typeof prisma.apiary.findMany).toBe('function')
    expect(typeof prisma.colony.findMany).toBe('function')
  })
})
```

- [ ] **Step 6: Test ausführen**

```bash
npx jest src/__tests__/lib/prisma.test.ts --no-coverage
```

Expected: PASS — 1 test suite, 1 passed

- [ ] **Step 7: Committen**

```bash
git add prisma/ src/lib/prisma.ts src/__tests__/lib/prisma.test.ts
git commit -m "feat: Prisma Schema mit allen MVP-Modellen und Migration"
```

---

## Task 3: Authentifizierung (NextAuth)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`
- Create: `src/app/api/register/route.ts`
- Create: `src/__tests__/api/register.test.ts`

- [ ] **Step 1: Failing test für Register-API**

Inhalt von `src/__tests__/api/register.test.ts`:
```typescript
import { POST } from '@/app/api/register/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('POST /api/register', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 wenn Email bereits existiert', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'test@test.de' })

    const req = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.de', password: 'password123', name: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Email bereits vergeben')
  })

  it('erstellt neuen User und gibt 201 zurück', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.user.create as jest.Mock).mockResolvedValue({ id: '2', email: 'neu@test.de', name: 'Neu' })

    const req = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'neu@test.de', password: 'sicher123', name: 'Neu' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.email).toBe('neu@test.de')
  })
})
```

- [ ] **Step 2: Test fehlschlagen lassen**

```bash
npx jest src/__tests__/api/register.test.ts --no-coverage
```

Expected: FAIL — Cannot find module '@/app/api/register/route'

- [ ] **Step 3: bcrypt installieren**

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

- [ ] **Step 4: Register-API implementieren**

Inhalt von `src/app/api/register/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email bereits vergeben' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true },
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 5: Test bestätigen**

```bash
npx jest src/__tests__/api/register.test.ts --no-coverage
```

Expected: PASS — 2 tests passed

- [ ] **Step 6: NextAuth konfigurieren**

Inhalt von `src/lib/auth.ts`:
```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
}
```

Inhalt von `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 7: Login-Seite erstellen**

Inhalt von `src/app/login/page.tsx`:
```typescript
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    if (result?.error) {
      setError('Ungültige Anmeldedaten')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-amber-800 mb-6">Anmelden</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg"
          >
            Anmelden
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          Noch kein Konto?{' '}
          <a href="/register" className="text-amber-600 hover:underline">Kostenlos registrieren</a>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 8: Registrierungs-Seite erstellen**

Inhalt von `src/app/register/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Fehler bei der Registrierung')
    } else {
      router.push('/login?registered=1')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-amber-800 mb-6">Konto erstellen</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg"
          >
            Registrieren
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          Schon ein Konto?{' '}
          <a href="/login" className="text-amber-600 hover:underline">Anmelden</a>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 9: SessionProvider in Root Layout**

Inhalt von `src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BeeApp — Bienenverwaltung',
  description: 'Digitale Stockkarte für Imker',
  manifest: '/manifest.json',
  themeColor: '#f59e0b',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="de">
      <body className={inter.className}>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
```

Inhalt von `src/components/SessionProviderWrapper.tsx`:
```typescript
'use client'
import { SessionProvider } from 'next-auth/react'
import { Session } from 'next-auth'

export default function SessionProviderWrapper({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
```

- [ ] **Step 10: Committen**

```bash
git add src/
git commit -m "feat: Authentifizierung mit NextAuth (Login, Register, JWT)"
```

---

## Task 4: Standort-API (Apiaries)

**Files:**
- Create: `src/app/api/apiaries/route.ts`
- Create: `src/app/api/apiaries/[id]/route.ts`
- Create: `src/__tests__/api/apiaries.test.ts`

- [ ] **Step 1: Failing tests schreiben**

Inhalt von `src/__tests__/api/apiaries.test.ts`:
```typescript
import { GET, POST } from '@/app/api/apiaries/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    apiary: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({ authOptions: {} }))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

describe('GET /api/apiaries', () => {
  it('returns 401 wenn nicht eingeloggt', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/apiaries')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('gibt Standorte des Users zurück', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } })
    ;(prisma.apiary.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', name: 'Garten', lat: 48.1, lng: 11.5 },
    ])
    const req = new NextRequest('http://localhost/api/apiaries')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Garten')
  })
})

describe('POST /api/apiaries', () => {
  it('erstellt neuen Standort', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } })
    ;(prisma.apiary.create as jest.Mock).mockResolvedValue({ id: 'a2', name: 'Wald', userId: 'user1' })

    const req = new NextRequest('http://localhost/api/apiaries', {
      method: 'POST',
      body: JSON.stringify({ name: 'Wald', lat: 48.2, lng: 11.6 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Wald')
  })
})
```

- [ ] **Step 2: Test fehlschlagen lassen**

```bash
npx jest src/__tests__/api/apiaries.test.ts --no-coverage
```

Expected: FAIL — Cannot find module

- [ ] **Step 3: Apiaries-Route implementieren**

Inhalt von `src/app/api/apiaries/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const apiaries = await prisma.apiary.findMany({
    where: { userId: session.user.id },
    include: { colonies: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(apiaries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { name, lat, lng, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 })

  const apiary = await prisma.apiary.create({
    data: { name, lat, lng, notes, userId: session.user.id },
  })
  return NextResponse.json(apiary, { status: 201 })
}
```

Inhalt von `src/app/api/apiaries/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const apiary = await prisma.apiary.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { colonies: true },
  })
  if (!apiary) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  return NextResponse.json(apiary)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const data = await req.json()
  const apiary = await prisma.apiary.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { name: data.name, lat: data.lat, lng: data.lng, notes: data.notes },
  })
  return NextResponse.json(apiary)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  await prisma.apiary.deleteMany({ where: { id: params.id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Tests bestätigen**

```bash
npx jest src/__tests__/api/apiaries.test.ts --no-coverage
```

Expected: PASS — 3 tests passed

- [ ] **Step 5: Committen**

```bash
git add src/app/api/apiaries/ src/__tests__/api/apiaries.test.ts
git commit -m "feat: Standort-API (GET, POST, PUT, DELETE)"
```

---

## Task 5: Völker-API (Colonies)

**Files:**
- Create: `src/app/api/colonies/route.ts`
- Create: `src/app/api/colonies/[id]/route.ts`
- Create: `src/__tests__/api/colonies.test.ts`

- [ ] **Step 1: Failing tests schreiben**

Inhalt von `src/__tests__/api/colonies.test.ts`:
```typescript
import { GET, POST } from '@/app/api/colonies/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    colony: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    apiary: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

describe('POST /api/colonies', () => {
  it('returns 403 wenn Apiary nicht dem User gehört', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } })
    ;(prisma.apiary.findFirst as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/colonies', {
      method: 'POST',
      body: JSON.stringify({ name: 'Volk 1', apiaryId: 'a1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('erstellt Volk wenn Apiary dem User gehört', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } })
    ;(prisma.apiary.findFirst as jest.Mock).mockResolvedValue({ id: 'a1', userId: 'user1' })
    ;(prisma.colony.create as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Volk 1', apiaryId: 'a1' })

    const req = new NextRequest('http://localhost/api/colonies', {
      method: 'POST',
      body: JSON.stringify({ name: 'Volk 1', apiaryId: 'a1', queenYear: 2024 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Test fehlschlagen lassen**

```bash
npx jest src/__tests__/api/colonies.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Colonies-Route implementieren**

Inhalt von `src/app/api/colonies/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const apiaryId = searchParams.get('apiaryId')

  const colonies = await prisma.colony.findMany({
    where: {
      apiary: { userId: session.user.id },
      ...(apiaryId ? { apiaryId } : {}),
    },
    include: {
      inspections: { orderBy: { date: 'desc' }, take: 1 },
      nfcTags: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(colonies)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { name, apiaryId, queenYear, queenColor } = await req.json()

  const apiary = await prisma.apiary.findFirst({
    where: { id: apiaryId, userId: session.user.id },
  })
  if (!apiary) return NextResponse.json({ error: 'Standort nicht gefunden' }, { status: 403 })

  const colony = await prisma.colony.create({
    data: { name, apiaryId, queenYear, queenColor },
  })
  return NextResponse.json(colony, { status: 201 })
}
```

Inhalt von `src/app/api/colonies/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const colony = await prisma.colony.findFirst({
    where: { id: params.id, apiary: { userId: session.user.id } },
    include: {
      inspections: { include: { items: true }, orderBy: { date: 'desc' } },
      treatments: { orderBy: { date: 'desc' } },
      nfcTags: { include: { actions: true } },
    },
  })
  if (!colony) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  return NextResponse.json(colony)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  await prisma.colony.deleteMany({
    where: { id: params.id, apiary: { userId: session.user.id } },
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Tests bestätigen**

```bash
npx jest src/__tests__/api/colonies.test.ts --no-coverage
```

Expected: PASS — 2 tests passed

- [ ] **Step 5: Committen**

```bash
git add src/app/api/colonies/ src/__tests__/api/colonies.test.ts
git commit -m "feat: Völker-API (GET, POST, DELETE) mit Ownership-Prüfung"
```

---

## Task 6: Inspektions-API (Stockkarten)

**Files:**
- Create: `src/app/api/inspections/route.ts`
- Create: `src/app/api/inspections/[id]/route.ts`
- Create: `src/__tests__/api/inspections.test.ts`

- [ ] **Step 1: Failing test schreiben**

Inhalt von `src/__tests__/api/inspections.test.ts`:
```typescript
import { POST } from '@/app/api/inspections/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    colony: { findFirst: jest.fn() },
    inspection: { create: jest.fn() },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

describe('POST /api/inspections', () => {
  it('speichert Inspektion mit Items', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } })
    ;(prisma.colony.findFirst as jest.Mock).mockResolvedValue({ id: 'c1' })
    ;(prisma.inspection.create as jest.Mock).mockResolvedValue({
      id: 'i1',
      colonyId: 'c1',
      date: new Date().toISOString(),
      items: [{ key: 'varroa', value: '2' }],
    })

    const req = new NextRequest('http://localhost/api/inspections', {
      method: 'POST',
      body: JSON.stringify({
        colonyId: 'c1',
        date: new Date().toISOString(),
        notes: 'Gute Stimmung',
        items: [{ key: 'varroa', value: '2' }, { key: 'population', value: 'stark' }],
        createdOffline: false,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.colonyId).toBe('c1')
  })
})
```

- [ ] **Step 2: Test fehlschlagen lassen**

```bash
npx jest src/__tests__/api/inspections.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Inspektions-Route implementieren**

Inhalt von `src/app/api/inspections/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { colonyId, date, notes, items, createdOffline } = await req.json()

  const colony = await prisma.colony.findFirst({
    where: { id: colonyId, apiary: { userId: session.user.id } },
  })
  if (!colony) return NextResponse.json({ error: 'Volk nicht gefunden' }, { status: 403 })

  const inspection = await prisma.inspection.create({
    data: {
      colonyId,
      date: date ? new Date(date) : new Date(),
      notes,
      createdOffline: createdOffline ?? false,
      items: {
        create: (items ?? []).map((item: { key: string; value: string }) => ({
          key: item.key,
          value: item.value,
        })),
      },
    },
    include: { items: true },
  })
  return NextResponse.json(inspection, { status: 201 })
}
```

Inhalt von `src/app/api/inspections/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const inspection = await prisma.inspection.findFirst({
    where: { id: params.id, colony: { apiary: { userId: session.user.id } } },
    include: { items: true },
  })
  if (!inspection) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  return NextResponse.json(inspection)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  await prisma.inspection.deleteMany({
    where: { id: params.id, colony: { apiary: { userId: session.user.id } } },
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Tests bestätigen**

```bash
npx jest src/__tests__/api/inspections.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Committen**

```bash
git add src/app/api/inspections/ src/__tests__/api/inspections.test.ts
git commit -m "feat: Inspektions-API mit verschachtelten Items und Offline-Flag"
```

---

## Task 7: NFC-API

**Files:**
- Create: `src/app/api/nfc/route.ts`
- Create: `src/app/api/nfc/[uid]/route.ts`
- Create: `src/__tests__/api/nfc.test.ts`

- [ ] **Step 1: Failing test schreiben**

Inhalt von `src/__tests__/api/nfc.test.ts`:
```typescript
import { GET as getByUid } from '@/app/api/nfc/[uid]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    nfcTag: {
      findUnique: jest.fn(),
    },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

describe('GET /api/nfc/[uid]', () => {
  it('gibt Tag mit Colony zurück wenn UID bekannt', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } })
    ;(prisma.nfcTag.findUnique as jest.Mock).mockResolvedValue({
      id: 'tag1',
      uid: 'ABC123',
      colony: { id: 'c1', name: 'Volk 1' },
      actions: [{ id: 'act1', type: 'inspection' }],
    })

    const req = new NextRequest('http://localhost/api/nfc/ABC123')
    const res = await getByUid(req, { params: { uid: 'ABC123' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.uid).toBe('ABC123')
    expect(body.colony.name).toBe('Volk 1')
  })

  it('gibt 404 wenn UID unbekannt', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } })
    ;(prisma.nfcTag.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/nfc/UNBEKANNT')
    const res = await getByUid(req, { params: { uid: 'UNBEKANNT' } })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Test fehlschlagen lassen**

```bash
npx jest src/__tests__/api/nfc.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: NFC-Routes implementieren**

Inhalt von `src/app/api/nfc/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const tags = await prisma.nfcTag.findMany({
    where: { colony: { apiary: { userId: session.user.id } } },
    include: { colony: { select: { id: true, name: true } }, actions: true },
  })
  return NextResponse.json(tags)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { uid, label, colonyId, actions } = await req.json()
  if (!uid || !colonyId) return NextResponse.json({ error: 'UID und Volk erforderlich' }, { status: 400 })

  const colony = await prisma.colony.findFirst({
    where: { id: colonyId, apiary: { userId: session.user.id } },
  })
  if (!colony) return NextResponse.json({ error: 'Volk nicht gefunden' }, { status: 403 })

  const tag = await prisma.nfcTag.create({
    data: {
      uid,
      label,
      colonyId,
      actions: {
        create: (actions ?? []).map((a: { type: string; defaultValues?: object }) => ({
          type: a.type,
          defaultValues: a.defaultValues,
        })),
      },
    },
    include: { actions: true },
  })
  return NextResponse.json(tag, { status: 201 })
}
```

Inhalt von `src/app/api/nfc/[uid]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { uid: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const tag = await prisma.nfcTag.findUnique({
    where: { uid: params.uid },
    include: {
      colony: { select: { id: true, name: true, apiaryId: true } },
      actions: true,
    },
  })
  if (!tag) return NextResponse.json({ error: 'Chip nicht registriert' }, { status: 404 })
  return NextResponse.json(tag)
}
```

- [ ] **Step 4: Tests bestätigen**

```bash
npx jest src/__tests__/api/nfc.test.ts --no-coverage
```

Expected: PASS — 2 tests passed

- [ ] **Step 5: Committen**

```bash
git add src/app/api/nfc/ src/__tests__/api/nfc.test.ts
git commit -m "feat: NFC-API — Tag-Lookup per UID, Tag-Verwaltung"
```

---

## Task 8: Offline-Datenbank (IndexedDB)

**Files:**
- Create: `src/lib/offline-db.ts`
- Create: `src/__tests__/lib/offline-db.test.ts`

- [ ] **Step 1: Failing test schreiben**

Inhalt von `src/__tests__/lib/offline-db.test.ts`:
```typescript
// IndexedDB in jsdom simulieren
import 'fake-indexeddb/auto'
import { saveInspectionOffline, getPendingInspections, clearInspection } from '@/lib/offline-db'

describe('offline-db', () => {
  it('speichert und liest eine Offline-Inspektion', async () => {
    const inspection = {
      id: 'local-1',
      colonyId: 'c1',
      date: new Date().toISOString(),
      notes: 'Offline gespeichert',
      items: [{ key: 'varroa', value: '3' }],
    }

    await saveInspectionOffline(inspection)
    const pending = await getPendingInspections()
    expect(pending).toHaveLength(1)
    expect(pending[0].colonyId).toBe('c1')
  })

  it('löscht Eintrag nach erfolgreichem Sync', async () => {
    await clearInspection('local-1')
    const pending = await getPendingInspections()
    expect(pending).toHaveLength(0)
  })
})
```

- [ ] **Step 2: fake-indexeddb installieren**

```bash
npm install --save-dev fake-indexeddb
```

- [ ] **Step 3: Test fehlschlagen lassen**

```bash
npx jest src/__tests__/lib/offline-db.test.ts --no-coverage
```

Expected: FAIL — Cannot find module '@/lib/offline-db'

- [ ] **Step 4: IndexedDB-Wrapper implementieren**

Inhalt von `src/lib/offline-db.ts`:
```typescript
import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'beeapp-offline'
const DB_VERSION = 1
const STORE_INSPECTIONS = 'pending-inspections'

type OfflineInspection = {
  id: string
  colonyId: string
  date: string
  notes?: string
  items: { key: string; value: string }[]
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
        db.createObjectStore(STORE_INSPECTIONS, { keyPath: 'id' })
      }
    },
  })
}

export async function saveInspectionOffline(inspection: OfflineInspection): Promise<void> {
  const db = await getDb()
  await db.put(STORE_INSPECTIONS, inspection)
}

export async function getPendingInspections(): Promise<OfflineInspection[]> {
  const db = await getDb()
  return db.getAll(STORE_INSPECTIONS)
}

export async function clearInspection(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_INSPECTIONS, id)
}
```

- [ ] **Step 5: Tests bestätigen**

```bash
npx jest src/__tests__/lib/offline-db.test.ts --no-coverage
```

Expected: PASS — 2 tests passed

- [ ] **Step 6: Committen**

```bash
git add src/lib/offline-db.ts src/__tests__/lib/offline-db.test.ts
git commit -m "feat: IndexedDB-Wrapper für Offline-Inspektionen"
```

---

## Task 9: PWA-Konfiguration

**Files:**
- Modify: `next.config.js`
- Create: `public/manifest.json`

- [ ] **Step 1: next.config.js mit next-pwa konfigurieren**

Inhalt von `next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
```

- [ ] **Step 2: PWA-Manifest erstellen**

Inhalt von `public/manifest.json`:
```json
{
  "name": "BeeApp — Bienenverwaltung",
  "short_name": "BeeApp",
  "description": "Digitale Stockkarte für Imker",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#fffbeb",
  "theme_color": "#f59e0b",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 3: Platzhalter-Icons erstellen**

```bash
mkdir -p public/icons
# Temporäre Platzhalter (später durch echte Icons ersetzen)
# 192x192 und 512x512 PNG-Dateien in public/icons/ ablegen
# z.B. mit einem Imker/Biene-Icon im Amber-Farbton
```

Hinweis: Für echte Icons ein 512x512 PNG mit Bienen-/Waben-Motiv in Amber (#f59e0b) erstellen und in `public/icons/` ablegen. `icon-192.png` ist eine verkleinerte Kopie.

- [ ] **Step 4: Meta-Tags im Root-Layout prüfen**

`src/app/layout.tsx` enthält bereits `manifest: '/manifest.json'` und `themeColor: '#f59e0b'` in den Metadata (aus Task 3). Sicherstellen dass dies vorhanden ist.

- [ ] **Step 5: Build testen**

```bash
npm run build
```

Expected: Build erfolgreich, Service Worker wird generiert (`public/sw.js`, `public/workbox-*.js`)

- [ ] **Step 6: Committen**

```bash
git add next.config.js public/manifest.json public/icons/
git commit -m "feat: PWA-Konfiguration mit next-pwa, Manifest und Icons"
```

---

## Task 10: App-UI — Dashboard, Standorte, Völker

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/apiaries/page.tsx`
- Create: `src/app/(app)/apiaries/[id]/page.tsx`
- Create: `src/app/(app)/colonies/[id]/page.tsx`
- Create: `src/app/(app)/colonies/[id]/inspect/page.tsx`
- Create: `src/components/apiaries/ApiaryCard.tsx`
- Create: `src/components/colonies/ColonyCard.tsx`
- Create: `src/components/colonies/InspectionForm.tsx`

- [ ] **Step 1: App-Layout mit Navigation**

Inhalt von `src/app/(app)/layout.tsx`:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-amber-50">
      <nav className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <Link href="/dashboard" className="text-xl font-bold">BeeApp</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/apiaries" className="hover:underline">Standorte</Link>
          <Link href="/nfc/scan" className="hover:underline">NFC Scan</Link>
          <Link href="/nfc/manage" className="hover:underline">NFC Chips</Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: ApiaryCard-Komponente**

Inhalt von `src/components/apiaries/ApiaryCard.tsx`:
```typescript
type ApiaryCardProps = {
  apiary: { id: string; name: string; notes?: string | null; colonies: { id: string }[] }
}

export default function ApiaryCard({ apiary }: ApiaryCardProps) {
  return (
    <a
      href={`/apiaries/${apiary.id}`}
      className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow border border-amber-100"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-amber-900">{apiary.name}</h2>
        <span className="text-sm text-amber-600">{apiary.colonies.length} Völker</span>
      </div>
      {apiary.notes && <p className="text-sm text-gray-500 mt-1">{apiary.notes}</p>}
    </a>
  )
}
```

- [ ] **Step 3: Standort-Listenseite**

Inhalt von `src/app/(app)/apiaries/page.tsx`:
```typescript
import ApiaryCard from '@/components/apiaries/ApiaryCard'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function ApiariesPage() {
  const session = await getServerSession(authOptions)
  const apiaries = await prisma.apiary.findMany({
    where: { userId: session!.user!.id },
    include: { colonies: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-amber-900">Meine Standorte</h1>
        <a
          href="/apiaries/new"
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Standort
        </a>
      </div>
      {apiaries.length === 0 ? (
        <p className="text-gray-500">Noch keine Standorte angelegt.</p>
      ) : (
        <div className="grid gap-4">
          {apiaries.map(a => <ApiaryCard key={a.id} apiary={a} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: ColonyCard-Komponente**

Inhalt von `src/components/colonies/ColonyCard.tsx`:
```typescript
type ColonyCardProps = {
  colony: {
    id: string
    name: string
    queenYear?: number | null
    queenColor?: string | null
    inspections: { date: string | Date }[]
  }
}

export default function ColonyCard({ colony }: ColonyCardProps) {
  const lastInspection = colony.inspections[0]
  return (
    <a
      href={`/colonies/${colony.id}`}
      className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow border border-amber-100"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-amber-900">{colony.name}</h2>
        {colony.queenYear && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
            Königin {colony.queenYear}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {lastInspection
          ? `Letzte Inspektion: ${new Date(lastInspection.date).toLocaleDateString('de-DE')}`
          : 'Noch keine Inspektion'}
      </p>
    </a>
  )
}
```

- [ ] **Step 5: InspectionForm-Komponente**

Inhalt von `src/components/colonies/InspectionForm.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveInspectionOffline } from '@/lib/offline-db'

const INSPECTION_KEYS = [
  { key: 'varroa', label: 'Varroa-Befall (Waben)', type: 'text' },
  { key: 'population', label: 'Volksstärke', type: 'select', options: ['schwach', 'mittel', 'stark'] },
  { key: 'brood', label: 'Brut', type: 'select', options: ['keine', 'wenig', 'gut', 'sehr gut'] },
  { key: 'temperament', label: 'Temperament', type: 'select', options: ['ruhig', 'normal', 'unruhig'] },
  { key: 'honey', label: 'Honigvorrat', type: 'select', options: ['leer', 'wenig', 'ausreichend', 'viel'] },
]

type Props = { colonyId: string }

export default function InspectionForm({ colonyId }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function setItem(key: string, value: string) {
    setItems(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      colonyId,
      date: new Date().toISOString(),
      notes,
      items: Object.entries(items).map(([key, value]) => ({ key, value })),
      createdOffline: !navigator.onLine,
    }

    if (!navigator.onLine) {
      await saveInspectionOffline({ ...payload, id: `local-${Date.now()}` })
      alert('Offline gespeichert — wird synchronisiert wenn du wieder online bist.')
      router.back()
      return
    }

    const res = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (res.ok) router.push(`/colonies/${colonyId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {INSPECTION_KEYS.map(field => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
          {field.type === 'select' ? (
            <select
              onChange={e => setItem(field.key, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400"
            >
              <option value="">-- wählen --</option>
              {field.options!.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type="text"
              onChange={e => setItem(field.key, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400"
            />
          )}
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
      >
        {saving ? 'Speichere…' : 'Inspektion speichern'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Volk-Detail-Seite**

Inhalt von `src/app/(app)/colonies/[id]/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ColonyPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const colony = await prisma.colony.findFirst({
    where: { id: params.id, apiary: { userId: session!.user!.id } },
    include: {
      inspections: { include: { items: true }, orderBy: { date: 'desc' } },
      treatments: { orderBy: { date: 'desc' } },
    },
  })
  if (!colony) notFound()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-amber-900">{colony.name}</h1>
        <Link
          href={`/colonies/${colony.id}/inspect`}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Inspektion
        </Link>
      </div>

      <div className="space-y-4">
        {colony.inspections.map(insp => (
          <div key={insp.id} className="bg-white rounded-xl shadow p-4 border border-amber-100">
            <p className="font-semibold text-amber-800">
              {new Date(insp.date).toLocaleDateString('de-DE')}
              {insp.createdOffline && <span className="ml-2 text-xs text-gray-400">(offline)</span>}
            </p>
            {insp.notes && <p className="text-sm text-gray-600 mt-1">{insp.notes}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {insp.items.map(item => (
                <span key={item.id} className="text-xs bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                  {item.key}: {item.value}
                </span>
              ))}
            </div>
          </div>
        ))}
        {colony.inspections.length === 0 && (
          <p className="text-gray-500">Noch keine Inspektionen.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Inspektions-Seite**

Inhalt von `src/app/(app)/colonies/[id]/inspect/page.tsx`:
```typescript
import InspectionForm from '@/components/colonies/InspectionForm'

export default function InspectPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-6">Neue Inspektion</h1>
      <InspectionForm colonyId={params.id} />
    </div>
  )
}
```

- [ ] **Step 8: Dev-Server starten und manuell testen**

```bash
npm run dev
```

Öffne `http://localhost:3000`, registriere einen Test-User, lege einen Standort und ein Volk an, erstelle eine Inspektion.

Expected: Alle Seiten laden fehlerfrei, Daten werden in der Datenbank gespeichert.

- [ ] **Step 9: Committen**

```bash
git add src/app/ src/components/
git commit -m "feat: App-UI — Dashboard, Standorte, Völker, Inspektionsformular"
```

---

## Task 11: NFC-Scanner UI

**Files:**
- Create: `src/app/(app)/nfc/scan/page.tsx`
- Create: `src/app/(app)/nfc/manage/page.tsx`
- Create: `src/components/nfc/NfcScanner.tsx`
- Create: `src/components/nfc/NfcTagList.tsx`

- [ ] **Step 1: NfcScanner-Komponente**

Inhalt von `src/components/nfc/NfcScanner.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type NfcTagResult = {
  uid: string
  colony: { id: string; name: string }
  actions: { id: string; type: string; defaultValues?: Record<string, unknown> }[]
}

export default function NfcScanner() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'scanning' | 'found' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [tag, setTag] = useState<NfcTagResult | null>(null)

  async function startScan() {
    // Web NFC API — nur in Chrome/Android verfügbar
    if (!('NDEFReader' in window)) {
      setStatus('error')
      setMessage('NFC wird in diesem Browser nicht unterstützt. Bitte Chrome auf Android verwenden.')
      return
    }

    setStatus('scanning')
    setMessage('Halte den NFC-Chip ans Telefon…')

    try {
      // @ts-ignore — NDEFReader ist nicht in allen TypeScript-Typen enthalten
      const reader = new window.NDEFReader()
      await reader.scan()

      reader.onreadingerror = () => {
        setStatus('error')
        setMessage('Chip konnte nicht gelesen werden.')
      }

      reader.onreading = async ({ serialNumber }: { serialNumber: string }) => {
        const uid = serialNumber.toUpperCase().replace(/:/g, '')
        const res = await fetch(`/api/nfc/${uid}`)

        if (!res.ok) {
          setStatus('error')
          setMessage(`Chip "${uid}" ist nicht registriert. Bitte zuerst einem Volk zuordnen.`)
          return
        }

        const data: NfcTagResult = await res.json()
        setTag(data)
        setStatus('found')
      }
    } catch (err) {
      setStatus('error')
      setMessage('NFC-Scan abgebrochen oder Fehler aufgetreten.')
    }
  }

  function handleAction(action: { type: string }) {
    if (!tag) return
    if (action.type === 'inspection') {
      router.push(`/colonies/${tag.colony.id}/inspect`)
    } else if (action.type === 'feeding') {
      router.push(`/colonies/${tag.colony.id}?action=feeding`)
    } else {
      router.push(`/colonies/${tag.colony.id}`)
    }
  }

  return (
    <div className="text-center space-y-6">
      {status === 'idle' && (
        <button
          onClick={startScan}
          className="w-48 h-48 mx-auto rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xl font-bold flex items-center justify-center shadow-lg"
        >
          NFC<br />Scannen
        </button>
      )}

      {status === 'scanning' && (
        <div className="w-48 h-48 mx-auto rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center animate-pulse">
          <p className="text-amber-800 font-semibold">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700">{message}</p>
          <button onClick={() => setStatus('idle')} className="mt-3 text-sm text-amber-600 hover:underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {status === 'found' && tag && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
          <p className="text-green-700 font-semibold text-lg">{tag.colony.name}</p>
          <div className="grid gap-3">
            {tag.actions.map(action => (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 rounded-lg"
              >
                {action.type === 'inspection' ? 'Inspektion starten' :
                 action.type === 'feeding' ? 'Fütterung buchen' :
                 action.type === 'treatment' ? 'Behandlung buchen' :
                 'Volk öffnen'}
              </button>
            ))}
            <button
              onClick={() => router.push(`/colonies/${tag.colony.id}`)}
              className="w-full border border-amber-400 text-amber-700 py-3 rounded-lg"
            >
              Stockkarte öffnen
            </button>
          </div>
          <button onClick={() => setStatus('idle')} className="text-sm text-gray-400 hover:underline">
            Neuen Chip scannen
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Scan-Seite**

Inhalt von `src/app/(app)/nfc/scan/page.tsx`:
```typescript
import NfcScanner from '@/components/nfc/NfcScanner'

export default function NfcScanPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-8 text-center">NFC-Chip scannen</h1>
      <NfcScanner />
      <p className="text-center text-xs text-gray-400 mt-6">
        Erfordert Chrome auf Android. iOS: QR-Code-Scan als Alternative geplant.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: NfcTagList-Komponente**

Inhalt von `src/components/nfc/NfcTagList.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'

type NfcTag = {
  id: string
  uid: string
  label?: string | null
  colony: { id: string; name: string }
  actions: { id: string; type: string }[]
}

export default function NfcTagList() {
  const [tags, setTags] = useState<NfcTag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nfc').then(r => r.json()).then(data => {
      setTags(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-gray-400">Lade Chips…</p>

  if (tags.length === 0) return <p className="text-gray-500">Noch keine NFC-Chips registriert.</p>

  return (
    <div className="space-y-3">
      {tags.map(tag => (
        <div key={tag.id} className="bg-white rounded-xl border border-amber-100 shadow p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-amber-900">{tag.label ?? tag.uid}</p>
              <p className="text-sm text-gray-500">Volk: {tag.colony.name}</p>
            </div>
            <span className="text-xs font-mono text-gray-400">{tag.uid}</span>
          </div>
          <div className="mt-2 flex gap-2 flex-wrap">
            {tag.actions.map(a => (
              <span key={a.id} className="text-xs bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                {a.type}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: NFC-Verwaltungsseite**

Inhalt von `src/app/(app)/nfc/manage/page.tsx`:
```typescript
import NfcTagList from '@/components/nfc/NfcTagList'

export default function NfcManagePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-amber-900">NFC-Chips</h1>
        <a
          href="/nfc/manage/new"
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Chip registrieren
        </a>
      </div>
      <NfcTagList />
    </div>
  )
}
```

- [ ] **Step 5: Manuell testen**

```bash
npm run dev
```

Öffne `http://localhost:3000/nfc/scan` — Scan-Button sollte erscheinen. Auf einem Android-Gerät mit Chrome testen falls NFC-Hardware verfügbar.

- [ ] **Step 6: Committen**

```bash
git add src/app/ src/components/nfc/
git commit -m "feat: NFC-Scanner UI und Tag-Verwaltungsseite"
```

---

## Task 12: Alle Tests + finaler Build

- [ ] **Step 1: Alle Tests ausführen**

```bash
npx jest --no-coverage
```

Expected: Alle Test-Suites PASS (register, apiaries, colonies, inspections, nfc, offline-db, prisma)

- [ ] **Step 2: TypeScript-Check**

```bash
npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 3: Production-Build**

```bash
npm run build
```

Expected: Build erfolgreich, keine kritischen Fehler

- [ ] **Step 4: Final-Commit**

```bash
git add .
git commit -m "feat: MVP vollständig — APIs, UI, NFC, PWA, Offline-Support"
```

---

## Out of Scope (nächste Phase)

- Landingpage (`/`) mit Marketing-Inhalt
- Leaflet-Karte für Standort-Verwaltung
- NFC-Tag-Registrierungsformular (`/nfc/manage/new`)
- Offline-Sync beim App-Start (Background Sync)
- QR-Code-Fallback für iOS
- Abo-Verwaltung / Bezahlung (Stripe)
