# Mini-CMS & Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the user to edit landing-page text and manage blog/news posts from the existing dashboard, with a public blog page and news integration into landing-page and shop.

**Architecture:** Extends the existing Prisma/PostgreSQL schema with two models (CmsContent key-value store, BlogPost). Tiptap WYSIWYG editor for blog content. Dashboard pages for editing. Public `/blog` route with Apple-style design matching the shop. Landing-page fetches CmsContent server-side with hardcoded fallbacks.

**Tech Stack:** Next.js (existing), Prisma 7 (existing), Tiptap (new), slugify (new), Vercel Blob via existing Mediathek

**Spec:** `docs/superpowers/specs/2026-09-17-mini-cms-blog-design.md`

## Global Constraints

- PostgreSQL via Prisma 7 — all migrations via `npx prisma db push`
- Auth: NextAuth session via `getServerSession(authOptions)` — user ID at `session.user.id`
- API pattern: `NextRequest`/`NextResponse`, JSON bodies, German error messages
- Apple-style UI: white cards, rounded-2xl, zinc palette, amber accents
- Bilingual: DE primary, EN secondary (locale param)
- Images: Vercel Blob via existing `/api/media` route

---

### Task 1: Database Schema & Dependencies

**Files:**
- Modify: `prisma/schema.prisma` — add CmsContent, BlogPost, enums, User relations
- Modify: `package.json` — add Tiptap + slugify

**Produces:**
- `CmsContent` model with `@@unique([key, locale])`
- `BlogPost` model with `slug @unique`
- `BlogCategory` enum (NEWS, SAISON, REZEPT, TIPP)
- `BlogStatus` enum (DRAFT, PUBLISHED)
- User relations: `cmsContents CmsContent[]`, `blogPosts BlogPost[]`

- [ ] **Step 1: Add enums and models to schema.prisma**

Append before the `// NextAuth required models` comment:

```prisma
// CMS
enum BlogCategory {
  NEWS
  SAISON
  REZEPT
  TIPP
}

enum BlogStatus {
  DRAFT
  PUBLISHED
}

model CmsContent {
  id        String   @id @default(cuid())
  key       String
  value     String   @db.Text
  locale    String   @default("de")
  updatedAt DateTime @updatedAt
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([key, locale])
}

model BlogPost {
  id             String       @id @default(cuid())
  title          String
  slug           String       @unique
  content        Json
  excerpt        String?      @db.Text
  coverImage     String?
  category       BlogCategory @default(NEWS)
  tags           String[]     @default([])
  status         BlogStatus   @default(DRAFT)
  seoTitle       String?
  seoDescription String?
  publishedAt    DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Add to User model (after `anthropicCredential`):

```prisma
  cmsContents     CmsContent[]
  blogPosts       BlogPost[]
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/pm slugify
```

- [ ] **Step 3: Push schema to database**

```bash
npx prisma db push
```

- [ ] **Step 4: Verify Prisma client generation**

```bash
npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "feat(cms): add CmsContent + BlogPost schema, install Tiptap & slugify"
```

---

### Task 2: CMS Content API Routes

**Files:**
- Create: `src/app/api/cms/content/route.ts`

**Interfaces:**
- Consumes: Prisma `CmsContent` model from Task 1
- Produces: `GET /api/cms/content?locale=de` → `Record<string, string>`, `PUT /api/cms/content` with body `{ key: string, value: string, locale: string }`

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/cms/content/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? 'de'

  const entries = await prisma.cmsContent.findMany({
    where: { locale },
    select: { key: true, value: true },
  })

  const map: Record<string, string> = {}
  for (const e of entries) map[e.key] = e.value

  return NextResponse.json(map)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key, value, locale } = await req.json()
  if (!key || typeof value !== 'string') {
    return NextResponse.json({ error: 'key und value erforderlich' }, { status: 400 })
  }

  const entry = await prisma.cmsContent.upsert({
    where: { key_locale: { key, locale: locale ?? 'de' } },
    update: { value, userId: session.user.id },
    create: { key, value, locale: locale ?? 'de', userId: session.user.id },
  })

  return NextResponse.json(entry)
}
```

- [ ] **Step 2: Test manually**

Start dev server, call `GET /api/cms/content` — should return `{}`.
Call `PUT /api/cms/content` with body `{ "key": "hero.title", "value": "Test", "locale": "de" }` — should return the created entry.
Call `GET /api/cms/content` again — should return `{ "hero.title": "Test" }`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cms/content/route.ts
git commit -m "feat(cms): add CMS content API (GET public, PUT auth)"
```

---

### Task 3: Blog API Routes

**Files:**
- Create: `src/app/api/cms/blog/route.ts`
- Create: `src/app/api/cms/blog/[id]/route.ts`

**Interfaces:**
- Consumes: Prisma `BlogPost` model, `BlogCategory`, `BlogStatus` from Task 1
- Produces:
  - `GET /api/cms/blog?status=PUBLISHED&category=NEWS&limit=10` → `BlogPost[]`
  - `POST /api/cms/blog` with body → `BlogPost`
  - `GET /api/cms/blog/[id]` → `BlogPost` (by id or slug)
  - `PUT /api/cms/blog/[id]` with body → `BlogPost`
  - `DELETE /api/cms/blog/[id]` → `{ ok: true }`

- [ ] **Step 1: Create the blog list/create route**

```typescript
// src/app/api/cms/blog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import slugify from 'slugify'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  const where: Record<string, unknown> = {}

  // Public: only PUBLISHED. Auth: optional filter
  if (!session) {
    where.status = 'PUBLISHED'
  } else if (status) {
    where.status = status
  }

  if (category) where.category = category

  const posts = await prisma.blogPost.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true } } },
  })

  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, content, excerpt, coverImage, category, tags, status, seoTitle, seoDescription } = body

  if (!title) return NextResponse.json({ error: 'Titel erforderlich' }, { status: 400 })

  let slug = slugify(title, { lower: true, strict: true, locale: 'de' })

  // Ensure unique slug
  const existing = await prisma.blogPost.findUnique({ where: { slug } })
  if (existing) slug = `${slug}-${Date.now()}`

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      content: content ?? {},
      excerpt: excerpt ?? null,
      coverImage: coverImage ?? null,
      category: category ?? 'NEWS',
      tags: tags ?? [],
      status: status ?? 'DRAFT',
      seoTitle: seoTitle ?? null,
      seoDescription: seoDescription ?? null,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      userId: session.user.id,
    },
  })

  return NextResponse.json(post, { status: 201 })
}
```

- [ ] **Step 2: Create the single post route**

```typescript
// src/app/api/cms/blog/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Try by ID first, then by slug
  const post = await prisma.blogPost.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { user: { select: { name: true } } },
  })

  if (!post) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  // Public: only PUBLISHED
  const session = await getServerSession(authOptions)
  if (!session && post.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json(post)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  // Set publishedAt when transitioning DRAFT → PUBLISHED
  let publishedAt = existing.publishedAt
  if (body.status === 'PUBLISHED' && existing.status === 'DRAFT') {
    publishedAt = new Date()
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      content: body.content ?? existing.content,
      excerpt: body.excerpt ?? existing.excerpt,
      coverImage: body.coverImage ?? existing.coverImage,
      category: body.category ?? existing.category,
      tags: body.tags ?? existing.tags,
      status: body.status ?? existing.status,
      seoTitle: body.seoTitle ?? existing.seoTitle,
      seoDescription: body.seoDescription ?? existing.seoDescription,
      publishedAt,
    },
  })

  return NextResponse.json(post)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.blogPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Test manually**

Create a post via POST, fetch list via GET, fetch single via GET `[slug]`, update via PUT, delete via DELETE.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cms/blog/
git commit -m "feat(cms): add blog API routes (CRUD + slug lookup)"
```

---

### Task 4: Shared Components — Tiptap Editor, Media Picker, Tiptap Renderer

**Files:**
- Create: `src/components/cms/TiptapEditor.tsx`
- Create: `src/components/cms/MediaPicker.tsx`
- Create: `src/components/cms/TiptapRenderer.tsx`

**Interfaces:**
- Produces:
  - `TiptapEditor({ content: JSONContent | null, onChange: (json: JSONContent) => void })` — WYSIWYG editor component
  - `MediaPicker({ open: boolean, onSelect: (url: string) => void, onClose: () => void })` — modal to pick/upload images
  - `TiptapRenderer({ content: JSONContent })` — read-only HTML renderer for blog posts

- [ ] **Step 1: Create TiptapEditor**

```tsx
// src/components/cms/TiptapEditor.tsx
'use client'

import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useState } from 'react'
import MediaPicker from './MediaPicker'

interface Props {
  content: JSONContent | null
  onChange: (json: JSONContent) => void
}

export default function TiptapEditor({ content, onChange }: Props) {
  const [showMedia, setShowMedia] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      ImageExt.configure({ inline: false }),
      LinkExt.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Schreibe deinen Beitrag...' }),
    ],
    content: content ?? undefined,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class: 'prose prose-zinc max-w-none min-h-[300px] focus:outline-none px-5 py-4',
      },
    },
  })

  if (!editor) return null

  const btn = (active: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
      active ? 'bg-amber-100 text-amber-700' : 'text-zinc-500 hover:bg-zinc-100'
    }`

  return (
    <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}>
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))}>
          H3
        </button>
        <div className="w-px h-6 bg-zinc-200 self-center mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
          <em>I</em>
        </button>
        <div className="w-px h-6 bg-zinc-200 self-center mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>
          Liste
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>
          1. 2. 3.
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>
          Zitat
        </button>
        <div className="w-px h-6 bg-zinc-200 self-center mx-1" />
        <button type="button" onClick={() => {
          const url = window.prompt('Link-URL:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }} className={btn(editor.isActive('link'))}>
          Link
        </button>
        <button type="button" onClick={() => setShowMedia(true)} className={btn(false)}>
          Bild
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Media Picker */}
      <MediaPicker
        open={showMedia}
        onSelect={(url) => {
          editor.chain().focus().setImage({ src: url }).run()
          setShowMedia(false)
        }}
        onClose={() => setShowMedia(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create MediaPicker**

```tsx
// src/components/cms/MediaPicker.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface MediaItem {
  url: string
  pathname: string
  size: number
  uploadedAt: string
}

interface Props {
  open: boolean
  onSelect: (url: string) => void
  onClose: () => void
}

export default function MediaPicker({ open, onSelect, onClose }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/media')
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'blog')
    try {
      const res = await fetch('/api/media', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setItems((prev) => [data, ...prev])
        onSelect(data.url)
      }
    } catch { /* ignore */ }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-zinc-900">Bild auswählen</h3>
          <div className="flex items-center gap-3">
            <label className="text-[13px] font-medium text-amber-600 hover:text-amber-700 cursor-pointer transition-colors">
              {uploading ? 'Lädt...' : 'Hochladen'}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <p className="text-center text-zinc-400 py-10">Laden...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-zinc-400 py-10">Noch keine Bilder hochgeladen</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.filter((i) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(i.pathname)).map((item) => (
                <button
                  key={item.url}
                  onClick={() => onSelect(item.url)}
                  className="aspect-square rounded-xl overflow-hidden border border-zinc-100 hover:border-amber-400 hover:ring-2 hover:ring-amber-200 transition-all"
                >
                  <Image src={item.url} alt="" width={160} height={160} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create TiptapRenderer**

```tsx
// src/components/cms/TiptapRenderer.tsx
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import type { JSONContent } from '@tiptap/react'

interface Props {
  content: JSONContent
}

export default function TiptapRenderer({ content }: Props) {
  const html = generateHTML(content, [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    ImageExt,
    LinkExt,
  ])

  return (
    <div
      className="prose prose-zinc max-w-none prose-img:rounded-2xl prose-headings:font-bold prose-a:text-amber-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

Note: `@tiptap/html` is included in `@tiptap/react`. If the import fails, install `@tiptap/html` separately.

- [ ] **Step 4: Verify build**

```bash
npx next build
```

Fix any type errors. Common issue: `@tiptap/html` may need separate install:
```bash
npm install @tiptap/html
```

- [ ] **Step 5: Commit**

```bash
git add src/components/cms/
git commit -m "feat(cms): add TiptapEditor, MediaPicker, TiptapRenderer components"
```

---

### Task 5: Dashboard — Landing-Page Content Editor

**Files:**
- Create: `src/app/dashboard/inhalte/page.tsx`

**Interfaces:**
- Consumes: `GET /api/cms/content?locale=X` and `PUT /api/cms/content` from Task 2

- [ ] **Step 1: Create the content editor page**

```tsx
// src/app/dashboard/inhalte/page.tsx
'use client'

import { useState, useEffect } from 'react'

const CMS_KEYS = [
  { key: 'hero.title', label: 'Hero Überschrift', multiline: false, placeholder: 'Frisch vom Stock.' },
  { key: 'hero.text', label: 'Hero Text', multiline: true, placeholder: 'Honig, Wachs & mehr...' },
  { key: 'hero.cta', label: 'Hero Button-Text', multiline: false, placeholder: 'Produkte entdecken' },
  { key: 'about.label', label: 'Über mich — Label', multiline: false, placeholder: 'Hallo, ich bin der Imker.' },
  { key: 'about.title', label: 'Über mich — Überschrift', multiline: false, placeholder: 'Leidenschaft für Bienen & Natur' },
  { key: 'about.text1', label: 'Über mich — Absatz 1', multiline: true, placeholder: 'Was als Hobby begann...' },
  { key: 'about.text2', label: 'Über mich — Absatz 2', multiline: true, placeholder: 'Mir ist wichtig...' },
  { key: 'products.label', label: 'Produkte — Label', multiline: false, placeholder: 'Aus dem Stock' },
  { key: 'products.title', label: 'Produkte — Überschrift', multiline: false, placeholder: 'Unsere Produkte' },
]

export default function InhaltePage() {
  const [locale, setLocale] = useState<'de' | 'en'>('de')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/cms/content?locale=${locale}`)
      .then((r) => r.json())
      .then((data) => setValues(data))
      .catch(() => {})
  }, [locale])

  async function handleSave() {
    setSaving(true)
    for (const item of CMS_KEYS) {
      const value = values[item.key]
      if (value !== undefined) {
        await fetch('/api/cms/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: item.key, value, locale }),
        })
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Inhalte bearbeiten</h1>
          <p className="text-zinc-500 mt-1 text-[14px]">Texte auf der Startseite anpassen</p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors">
          Vorschau →
        </a>
      </div>

      {/* Locale tabs */}
      <div className="flex gap-2 mb-6">
        {(['de', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
              locale === l ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {l === 'de' ? 'Deutsch' : 'English'}
          </button>
        ))}
      </div>

      {/* Content fields */}
      <div className="space-y-4">
        {CMS_KEYS.map((item) => (
          <div key={item.key} className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">{item.label}</label>
            {item.multiline ? (
              <textarea
                rows={4}
                value={values[item.key] ?? ''}
                placeholder={item.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-[14px] text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
              />
            ) : (
              <input
                type="text"
                value={values[item.key] ?? ''}
                placeholder={item.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-[14px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
              />
            )}
            <p className="text-[11px] text-zinc-400 mt-1.5">{item.key}</p>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-[14px] rounded-xl transition-colors"
        >
          {saving ? 'Speichert...' : 'Speichern'}
        </button>
        {saved && <span className="text-[13px] text-green-600 font-medium">Gespeichert!</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

Navigate to `/dashboard/inhalte`. Verify form loads, edit a field, click save, refresh page, verify value persists.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/inhalte/
git commit -m "feat(cms): add landing page content editor in dashboard"
```

---

### Task 6: Dashboard — Blog Overview & Editor

**Files:**
- Create: `src/app/dashboard/blog/page.tsx`
- Create: `src/app/dashboard/blog/[id]/page.tsx`
- Create: `src/app/dashboard/blog/neu/page.tsx`

**Interfaces:**
- Consumes: Blog API from Task 3, TiptapEditor + MediaPicker from Task 4

- [ ] **Step 1: Create blog overview page**

```tsx
// src/app/dashboard/blog/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null
  coverImage: string | null; category: string; status: string
  publishedAt: string | null; createdAt: string
}

const categoryColors: Record<string, string> = {
  NEWS: 'bg-blue-100 text-blue-700',
  SAISON: 'bg-green-100 text-green-700',
  REZEPT: 'bg-orange-100 text-orange-700',
  TIPP: 'bg-purple-100 text-purple-700',
}

const categoryLabels: Record<string, string> = {
  NEWS: 'News', SAISON: 'Saison', REZEPT: 'Rezept', TIPP: 'Tipp',
}

export default function BlogDashboard() {
  const [posts, setPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    fetch('/api/cms/blog')
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Blog</h1>
          <p className="text-zinc-500 mt-1 text-[14px]">Neuigkeiten und Beiträge verwalten</p>
        </div>
        <Link
          href="/dashboard/blog/neu"
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[13px] rounded-xl transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Neuer Beitrag
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <p className="text-zinc-400 text-[14px]">Noch keine Beiträge</p>
          <Link href="/dashboard/blog/neu" className="mt-3 inline-block text-[13px] font-medium text-amber-600">Ersten Beitrag schreiben →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/dashboard/blog/${post.id}`} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              {post.coverImage ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  <Image src={post.coverImage} alt="" width={64} height={64} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 text-2xl">
                  📝
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColors[post.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {categoryLabels[post.category] ?? post.category}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {post.status === 'PUBLISHED' ? 'Veröffentlicht' : 'Entwurf'}
                  </span>
                </div>
                <p className="text-[14px] font-medium text-zinc-900 truncate">{post.title}</p>
                {post.excerpt && <p className="text-[12px] text-zinc-400 truncate mt-0.5">{post.excerpt}</p>}
              </div>
              <span className="text-[12px] text-zinc-400 shrink-0">
                {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create blog editor page (shared for new + edit)**

```tsx
// src/app/dashboard/blog/[id]/page.tsx
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { JSONContent } from '@tiptap/react'
import MediaPicker from '@/components/cms/MediaPicker'
import Image from 'next/image'

const TiptapEditor = dynamic(() => import('@/components/cms/TiptapEditor'), { ssr: false })

interface Props { params: Promise<{ id: string }> }

const CATEGORIES = [
  { value: 'NEWS', label: 'News' },
  { value: 'SAISON', label: 'Saison' },
  { value: 'REZEPT', label: 'Rezept' },
  { value: 'TIPP', label: 'Tipp' },
]

export default function BlogEditorPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<JSONContent | null>(null)
  const [excerpt, setExcerpt] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [category, setCategory] = useState('NEWS')
  const [tags, setTags] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [saving, setSaving] = useState(false)
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/cms/blog/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.push('/dashboard/blog'); return }
        setTitle(data.title ?? '')
        setContent(data.content ?? null)
        setExcerpt(data.excerpt ?? '')
        setCoverImage(data.coverImage ?? '')
        setCategory(data.category ?? 'NEWS')
        setTags((data.tags ?? []).join(', '))
        setSeoTitle(data.seoTitle ?? '')
        setSeoDescription(data.seoDescription ?? '')
        setStatus(data.status ?? 'DRAFT')
        setLoaded(true)
      })
      .catch(() => router.push('/dashboard/blog'))
  }, [id, router])

  async function save(newStatus?: string) {
    setSaving(true)
    const body = {
      title, content, excerpt: excerpt || null,
      coverImage: coverImage || null,
      category, tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: newStatus ?? status,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
    }
    await fetch(`/api/cms/blog/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (newStatus) setStatus(newStatus)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Beitrag wirklich löschen?')) return
    setDeleting(true)
    await fetch(`/api/cms/blog/${id}`, { method: 'DELETE' })
    router.push('/dashboard/blog')
  }

  if (!loaded) return <div className="px-8 py-8"><p className="text-zinc-400">Laden...</p></div>

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/dashboard/blog')} className="text-[13px] text-zinc-500 hover:text-zinc-700 transition-colors">
          ← Zurück
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => save()} disabled={saving} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-[13px] rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Speichert...' : 'Entwurf speichern'}
          </button>
          <button onClick={() => save('PUBLISHED')} disabled={saving} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[13px] rounded-xl transition-colors disabled:opacity-50">
            Veröffentlichen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main column */}
        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel des Beitrags..."
            className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-xl font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
          />

          {/* Cover image */}
          <div
            onClick={() => setShowCoverPicker(true)}
            className="bg-white border border-zinc-200 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-400 transition-colors"
          >
            {coverImage ? (
              <div className="relative h-48">
                <Image src={coverImage} alt="Cover" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white font-medium text-[13px] opacity-0 hover:opacity-100 transition-opacity">Ändern</span>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-zinc-400 text-[13px]">
                Cover-Bild auswählen
              </div>
            )}
          </div>

          <TiptapEditor content={content} onChange={setContent} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Honig, Sommer, Ernte"
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <p className="text-[11px] text-zinc-400 mt-1">Komma-getrennt</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">Excerpt</label>
            <textarea
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={200}
              placeholder="Kurze Vorschau..."
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <p className="text-[11px] text-zinc-400 mt-1">{excerpt.length}/200</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">SEO</label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={title || 'SEO-Titel (optional)'}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 mb-2 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <textarea
              rows={2}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder={excerpt || 'SEO-Beschreibung (optional)'}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full px-4 py-2.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            Beitrag löschen
          </button>
        </div>
      </div>

      <MediaPicker open={showCoverPicker} onSelect={(url) => { setCoverImage(url); setShowCoverPicker(false) }} onClose={() => setShowCoverPicker(false)} />
    </div>
  )
}
```

- [ ] **Step 3: Create "new post" page**

```tsx
// src/app/dashboard/blog/neu/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { JSONContent } from '@tiptap/react'
import MediaPicker from '@/components/cms/MediaPicker'
import Image from 'next/image'

const TiptapEditor = dynamic(() => import('@/components/cms/TiptapEditor'), { ssr: false })

const CATEGORIES = [
  { value: 'NEWS', label: 'News' },
  { value: 'SAISON', label: 'Saison' },
  { value: 'REZEPT', label: 'Rezept' },
  { value: 'TIPP', label: 'Tipp' },
]

export default function NewBlogPost() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<JSONContent | null>(null)
  const [excerpt, setExcerpt] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [category, setCategory] = useState('NEWS')
  const [tags, setTags] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCoverPicker, setShowCoverPicker] = useState(false)

  async function save(status: string) {
    if (!title.trim()) { alert('Bitte Titel eingeben'); return }
    setSaving(true)
    const body = {
      title, content: content ?? {}, excerpt: excerpt || null,
      coverImage: coverImage || null,
      category, tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      status,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
    }
    const res = await fetch('/api/cms/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const post = await res.json()
    setSaving(false)
    router.push(`/dashboard/blog/${post.id}`)
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/dashboard/blog')} className="text-[13px] text-zinc-500 hover:text-zinc-700 transition-colors">
          ← Zurück
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => save('DRAFT')} disabled={saving} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-[13px] rounded-xl transition-colors disabled:opacity-50">
            Als Entwurf speichern
          </button>
          <button onClick={() => save('PUBLISHED')} disabled={saving} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[13px] rounded-xl transition-colors disabled:opacity-50">
            Veröffentlichen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel des Beitrags..."
            className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-xl font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
          />

          <div
            onClick={() => setShowCoverPicker(true)}
            className="bg-white border border-zinc-200 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-400 transition-colors"
          >
            {coverImage ? (
              <div className="relative h-48">
                <Image src={coverImage} alt="Cover" fill className="object-cover" />
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-zinc-400 text-[13px]">
                Cover-Bild auswählen
              </div>
            )}
          </div>

          <TiptapEditor content={content} onChange={setContent} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">Kategorie</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-200">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">Tags</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Honig, Sommer, Ernte" className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">Excerpt</label>
            <textarea rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={200} placeholder="Kurze Vorschau..." className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-200" />
            <p className="text-[11px] text-zinc-400 mt-1">{excerpt.length}/200</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-zinc-700 mb-2">SEO</label>
            <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO-Titel (optional)" className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 mb-2 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            <textarea rows={2} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="SEO-Beschreibung (optional)" className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </div>
        </div>
      </div>

      <MediaPicker open={showCoverPicker} onSelect={(url) => { setCoverImage(url); setShowCoverPicker(false) }} onClose={() => setShowCoverPicker(false)} />
    </div>
  )
}
```

- [ ] **Step 4: Test in browser**

Navigate to `/dashboard/blog` — should show empty state. Click "Neuer Beitrag", write a title + some content, save as draft. Verify it appears in list. Edit it, publish. Verify status badge changes.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/blog/
git commit -m "feat(cms): add blog dashboard — overview, new post, editor"
```

---

### Task 7: Dashboard Navigation — Add Inhalte & Blog

**Files:**
- Modify: `src/components/Sidebar.tsx` — add Inhalte + Blog nav items after Vorbestellungen
- Modify: `src/components/BottomNav.tsx` — add Inhalte + Blog to MORE_ITEMS before Einstellungen

**Interfaces:**
- Consumes: routes from Tasks 5 and 6

- [ ] **Step 1: Add to Sidebar navItems array**

After the NFC-Tags entry (`{ label: 'NFC-Tags', href: '/dashboard/nfc', ... }`), add:

```tsx
  {
    label: 'Inhalte',
    href: '/dashboard/inhalte',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    label: 'Blog',
    href: '/dashboard/blog',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><line x1="10" y1="6" x2="18" y2="6"/><line x1="10" y1="10" x2="18" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
```

- [ ] **Step 2: Add to BottomNav MORE_ITEMS array**

Before the Einstellungen entry, add:

```tsx
  { label: 'Inhalte', href: '/dashboard/inhalte', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )},
  { label: 'Blog', href: '/dashboard/blog', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><line x1="10" y1="6" x2="18" y2="6"/><line x1="10" y1="10" x2="18" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  )},
```

- [ ] **Step 3: Verify navigation**

Check desktop sidebar and mobile bottom-nav "Mehr" drawer both show Inhalte and Blog.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx src/components/BottomNav.tsx
git commit -m "feat(cms): add Inhalte + Blog to dashboard navigation"
```

---

### Task 8: Public Blog Pages

**Files:**
- Create: `src/app/blog/layout.tsx`
- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: Blog API from Task 3, TiptapRenderer from Task 4

- [ ] **Step 1: Create blog layout**

```tsx
// src/app/blog/layout.tsx
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Blog | KörBee Imkerei',
  description: 'Neuigkeiten aus der Imkerei — Saisonberichte, Rezepte und Tipps',
}

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--shop-bg)', color: 'var(--shop-ink)', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Manrope:wght@400;500;600;700;800&display=swap" />
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create blog overview page**

```tsx
// src/app/blog/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null
  coverImage: string | null; category: string; publishedAt: string
  user: { name: string | null }
}

const categoryColors: Record<string, string> = {
  NEWS: 'bg-blue-100 text-blue-700', SAISON: 'bg-green-100 text-green-700',
  REZEPT: 'bg-orange-100 text-orange-700', TIPP: 'bg-purple-100 text-purple-700',
}
const categoryLabels: Record<string, string> = {
  NEWS: 'News', SAISON: 'Saison', REZEPT: 'Rezept', TIPP: 'Tipp',
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    const url = filter ? `/api/cms/blog?category=${filter}` : '/api/cms/blog'
    fetch(url).then((r) => r.json()).then((d) => setPosts(Array.isArray(d) ? d : [])).catch(() => {})
  }, [filter])

  const filters = [
    { value: null, label: 'Alle' },
    { value: 'NEWS', label: 'News' },
    { value: 'SAISON', label: 'Saison' },
    { value: 'REZEPT', label: 'Rezept' },
    { value: 'TIPP', label: 'Tipp' },
  ]

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pt-3 pb-2">
        <nav className="max-w-3xl mx-auto flex items-center justify-between gap-3 px-5 py-2.5" style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', borderRadius: 999, boxShadow: 'var(--shop-shadow)' }}>
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={32} height={32} className="rounded-lg" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: 'var(--shop-ink)' }}>KörBee</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/shop" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500 }} className="hover:opacity-70 transition-opacity">Shop</Link>
            <Link href="/blog" style={{ color: 'var(--shop-ink)', textDecoration: 'none', fontWeight: 600 }} className="hover:opacity-70 transition-opacity">Blog</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Neuigkeiten aus der Imkerei</h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--shop-dim)' }}>Saisonberichte, Rezepte und Tipps rund um Honig & Bienen</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((f) => (
            <button
              key={f.value ?? 'all'}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                filter === f.value ? 'bg-amber-500 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-100'
              }`}
              style={filter !== f.value ? { border: '1px solid var(--shop-border)' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🐝</p>
            <p style={{ color: 'var(--shop-dim)' }}>Noch keine Beiträge veröffentlicht.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="rounded-[20px] overflow-hidden hover:-translate-y-1 transition-transform" style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', boxShadow: 'var(--shop-shadow)', textDecoration: 'none', color: 'inherit' }}>
                {post.coverImage ? (
                  <div className="h-44">
                    <Image src={post.coverImage} alt="" width={400} height={176} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center text-5xl" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>🍯</div>
                )}
                <div className="p-5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColors[post.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {categoryLabels[post.category] ?? post.category}
                  </span>
                  <h2 className="text-[15px] font-bold mt-2 line-clamp-2" style={{ color: 'var(--shop-ink)' }}>{post.title}</h2>
                  {post.excerpt && <p className="text-[13px] mt-1.5 line-clamp-2" style={{ color: 'var(--shop-dim)' }}>{post.excerpt}</p>}
                  <p className="text-[12px] mt-3" style={{ color: 'var(--shop-dim)' }}>
                    {new Date(post.publishedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto px-4 py-8" style={{ borderTop: '1px solid var(--shop-border)', fontSize: '.82rem', color: 'var(--shop-dim)' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--shop-ink)' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={24} height={24} className="rounded-md" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.3rem' }}>KörBee</span>
          </Link>
          <div className="flex gap-6">
            <Link href="/shop" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Shop</Link>
            <Link href="/impressum" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/datenschutz" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Datenschutz</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
```

- [ ] **Step 3: Create single blog post page**

```tsx
// src/app/blog/[slug]/page.tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import TiptapRenderer from '@/components/cms/TiptapRenderer'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({ where: { slug } })
  if (!post) return {}
  return {
    title: (post.seoTitle ?? post.title) + ' | KörBee',
    description: post.seoDescription ?? post.excerpt ?? undefined,
  }
}

const categoryLabels: Record<string, string> = {
  NEWS: 'News', SAISON: 'Saison', REZEPT: 'Rezept', TIPP: 'Tipp',
}
const categoryColors: Record<string, string> = {
  NEWS: 'bg-blue-100 text-blue-700', SAISON: 'bg-green-100 text-green-700',
  REZEPT: 'bg-orange-100 text-orange-700', TIPP: 'bg-purple-100 text-purple-700',
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { user: { select: { name: true } } },
  })

  if (!post || post.status !== 'PUBLISHED') notFound()

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pt-3 pb-2">
        <nav className="max-w-3xl mx-auto flex items-center justify-between gap-3 px-5 py-2.5" style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', borderRadius: 999, boxShadow: 'var(--shop-shadow)' }}>
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={32} height={32} className="rounded-lg" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: 'var(--shop-ink)' }}>KörBee</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/blog" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500 }} className="hover:opacity-70 transition-opacity">Alle Beiträge</Link>
            <Link href="/shop" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500 }} className="hover:opacity-70 transition-opacity">Shop</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Cover */}
        {post.coverImage && (
          <div className="rounded-[20px] overflow-hidden mb-8 h-64 sm:h-80 lg:h-96">
            <Image src={post.coverImage} alt={post.title} width={800} height={400} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {categoryLabels[post.category] ?? post.category}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--shop-dim)' }}>
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8" style={{ color: 'var(--shop-ink)' }}>{post.title}</h1>

        {/* Content */}
        <TiptapRenderer content={post.content as any} />

        {/* CTA */}
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--shop-border)' }}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/blog" className="text-[14px] font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>
              ← Alle Beiträge
            </Link>
            <Link
              href="/shop"
              className="px-5 py-2.5 rounded-full text-[14px] font-semibold transition-colors"
              style={{ background: 'var(--shop-ink)', color: 'var(--shop-bg)', textDecoration: 'none' }}
            >
              Zum Shop →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto px-4 py-8" style={{ borderTop: '1px solid var(--shop-border)', fontSize: '.82rem', color: 'var(--shop-dim)' }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--shop-ink)' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={24} height={24} className="rounded-md" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.3rem' }}>KörBee</span>
          </Link>
          <div className="flex gap-6">
            <Link href="/impressum" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/datenschutz" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }}>Datenschutz</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
```

- [ ] **Step 4: Verify build + test manually**

```bash
npx next build
```

Visit `/blog` — should show empty state or published posts. Create a post in dashboard, publish it, verify it shows on `/blog` and `/blog/[slug]` renders correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/blog/
git commit -m "feat(cms): add public blog pages (/blog, /blog/[slug])"
```

---

### Task 9: Landing-Page Integration — CMS Texte + Neuigkeiten-Sektion

**Files:**
- Modify: `src/app/page.tsx` — load CmsContent server-side, add news section

**Interfaces:**
- Consumes: Prisma `CmsContent` and `BlogPost` models

- [ ] **Step 1: Convert landing page to fetch CMS content**

The landing page is currently `'use client'`. We need to split it: a server component that fetches CMS data and passes it as props to the client component.

Create a new wrapper. Modify `src/app/page.tsx`:

At the top, add a server-side data-fetching wrapper. The current page exports `LandingPage` as default — we need to wrap it.

The approach: keep the existing client component but rename it, add a server component that fetches CMS data and blog posts, passes them as props.

Add to the top of the file (after imports):

```tsx
// Add these imports at the top
import { prisma } from '@/lib/prisma'
```

Remove `'use client'` from the top.

Extract the existing `LandingPage` function into a client component by creating `src/components/landing/LandingContent.tsx` with all the existing client-side code from `page.tsx` (move everything there with `'use client'`).

Then the new `page.tsx` becomes:

```tsx
// src/app/page.tsx
import { prisma } from '@/lib/prisma'
import LandingContent from '@/components/landing/LandingContent'

export default async function LandingPage() {
  const [cmsEntries, blogPosts] = await Promise.all([
    prisma.cmsContent.findMany({ where: { locale: 'de' }, select: { key: true, value: true } }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, category: true, publishedAt: true },
    }),
  ])

  const cms: Record<string, string> = {}
  for (const e of cmsEntries) cms[e.key] = e.value

  return <LandingContent cms={cms} blogPosts={blogPosts} />
}
```

Move the entire current content of `page.tsx` (the `'use client'` component with all its code) into `src/components/landing/LandingContent.tsx`, adding `cms` and `blogPosts` as props.

In `LandingContent.tsx`, use the cms values with fallbacks:

```tsx
// Replace hardcoded text with:
const heroTitle = cms['hero.title'] || 'Frisch vom Stock.'
const heroText = cms['hero.text'] || 'Honig, Wachs & mehr — direkt vom Imker.\nEhrliche Produkte, faire Preise.'
const heroCta = cms['hero.cta'] || 'Produkte entdecken'
const aboutLabel = cms['about.label'] || 'Hallo, ich bin der Imker.'
const aboutTitle = cms['about.title'] || 'Leidenschaft für Bienen & Natur'
const aboutText1 = cms['about.text1'] || 'Was als Hobby begann, ist heute meine Berufung...'
const aboutText2 = cms['about.text2'] || 'Mir ist wichtig, dass meine Produkte natürlich...'
const productsLabel = cms['products.label'] || 'Aus dem Stock'
const productsTitle = cms['products.title'] || 'Unsere Produkte'
```

Then use these variables instead of hardcoded strings in the JSX.

Add a news section before the footer:

```tsx
{/* Neuigkeiten */}
{blogPosts.length > 0 && (
  <section className="max-w-5xl mx-auto px-6 py-16">
    <FadeIn>
      <div className="text-center mb-8">
        <p style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.3rem', color: 'var(--shop-accent)', marginBottom: 4 }}>
          Aktuelles
        </p>
        <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)' }}>Neuigkeiten</h2>
      </div>
    </FadeIn>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {blogPosts.map((post) => (
        <FadeIn key={post.id}>
          <Link href={`/blog/${post.slug}`} className="rounded-[20px] overflow-hidden block hover:-translate-y-1 transition-transform" style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', boxShadow: 'var(--shop-shadow)', textDecoration: 'none', color: 'inherit' }}>
            {post.coverImage ? (
              <div className="h-40">
                <Image src={post.coverImage} alt="" width={400} height={160} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-4xl" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>🍯</div>
            )}
            <div className="p-5">
              <h3 className="text-[14px] font-bold line-clamp-2">{post.title}</h3>
              {post.excerpt && <p className="text-[12px] mt-1 line-clamp-2" style={{ color: 'var(--shop-dim)' }}>{post.excerpt}</p>}
              <p className="text-[11px] mt-2" style={{ color: 'var(--shop-dim)' }}>
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : ''}
              </p>
            </div>
          </Link>
        </FadeIn>
      ))}
    </div>
    <div className="text-center mt-6">
      <Link href="/blog" className="text-[13px] font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}>Alle Beiträge →</Link>
    </div>
  </section>
)}
```

Also add "Blog" to the footer links.

- [ ] **Step 2: Verify build + test**

```bash
npx next build
```

Visit `/` — texts should show (either from CMS or hardcoded fallbacks). Edit a text in `/dashboard/inhalte`, refresh landing page, verify change appears. If blog posts exist, verify news section.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/components/landing/LandingContent.tsx
git commit -m "feat(cms): landing page loads CMS content + shows blog news section"
```

---

### Task 10: Shop News Banner + Footer Links

**Files:**
- Modify: `src/app/shop/page.tsx` — add news banner between header and hero
- Modify: `src/components/shop/LegalPage.tsx` — add Blog to footer links

**Interfaces:**
- Consumes: `GET /api/cms/blog?limit=1` from Task 3

- [ ] **Step 1: Add news banner to shop page**

In `src/app/shop/page.tsx`, inside the `ShopLandingPage` component, add a state for the latest blog post and fetch it:

```tsx
const [latestPost, setLatestPost] = useState<{ title: string; slug: string; publishedAt: string } | null>(null)
const [bannerDismissed, setBannerDismissed] = useState(false)
```

In the `useEffect`, add:

```tsx
fetch('/api/cms/blog?limit=1')
  .then((r) => r.json())
  .then((data) => {
    if (Array.isArray(data) && data.length > 0) {
      const post = data[0]
      // Only show if less than 30 days old
      const age = Date.now() - new Date(post.publishedAt).getTime()
      if (age < 30 * 24 * 60 * 60 * 1000) setLatestPost(post)
    }
  })
  .catch(() => {})

setBannerDismissed(localStorage.getItem('shop-news-dismissed') === 'true')
```

After the `</header>` and before `{/* Hero / Diorama */}`, add:

```tsx
{/* News banner */}
{latestPost && !bannerDismissed && (
  <div className="mx-4 mt-2">
    <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-2.5 rounded-2xl" style={{ background: 'var(--shop-cream)', border: '1px solid var(--shop-border)' }}>
      <Link href={`/blog/${latestPost.slug}`} className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--shop-ink)', textDecoration: 'none' }}>
        <span style={{ color: 'var(--shop-accent)' }}>Neu:</span>
        <span className="truncate">{latestPost.title}</span>
      </Link>
      <button
        onClick={() => { setBannerDismissed(true); localStorage.setItem('shop-news-dismissed', 'true') }}
        className="text-zinc-400 hover:text-zinc-600 ml-2 shrink-0"
        style={{ fontSize: '1.1rem', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 2: Add Blog link to LegalPage footer**

In `src/components/shop/LegalPage.tsx`, add to the `footerLinks` array:

```tsx
{ href: '/blog', label: 'Blog' },
```

- [ ] **Step 3: Add Blog link to landing page footer**

In `src/components/landing/LandingContent.tsx` (or wherever the footer links are), add a Blog link in the footer navigation.

- [ ] **Step 4: Verify everything works**

Test shop page — banner should show if a published blog post exists. Click "×" to dismiss. Verify it stays dismissed on refresh. Check footer links.

- [ ] **Step 5: Build + commit**

```bash
npx next build
git add src/app/shop/page.tsx src/components/shop/LegalPage.tsx src/components/landing/LandingContent.tsx
git commit -m "feat(cms): add shop news banner + blog links in footers"
```

- [ ] **Step 6: Push to deploy**

```bash
git push origin main
```
