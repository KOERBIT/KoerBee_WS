# Mini-CMS & Blog — Design Spec

**Datum:** 2026-09-17
**Ziel:** Einfache Content-Pflege der Landing-Page und ein vollwertiger Blog/News-Bereich, integriert ins bestehende Dashboard.

---

## 1. Datenbank-Schema

### CmsContent — Key-Value für Landing-Page-Texte

```prisma
model CmsContent {
  id        String   @id @default(cuid())
  key       String   // z.B. "hero.title", "about.text1", "hero.cta"
  value     String   @db.Text
  locale    String   @default("de") // "de" oder "en"
  updatedAt DateTime @updatedAt
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  @@unique([key, locale])
}
```

**Definierte Keys:**

| Key | Beschreibung |
|-----|-------------|
| `hero.title` | Hero-Überschrift ("Frisch vom Stock.") |
| `hero.text` | Hero-Beschreibungstext |
| `hero.cta` | CTA-Button-Text ("Produkte entdecken") |
| `about.label` | Label über Überschrift ("Hallo, ich bin der Imker.") |
| `about.title` | Über-mich-Überschrift ("Leidenschaft für Bienen & Natur") |
| `about.text1` | Erster Absatz Über-mich |
| `about.text2` | Zweiter Absatz Über-mich |
| `products.label` | Produkt-Sektion Label ("Aus dem Stock") |
| `products.title` | Produkt-Sektion Titel ("Unsere Produkte") |

Jeder Key existiert einmal pro Locale (de/en).

### BlogPost — Blog/News-Beiträge

```prisma
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

model BlogPost {
  id             String       @id @default(cuid())
  title          String
  slug           String       @unique
  content        Json         // Tiptap JSON-Format
  excerpt        String?      @db.Text
  coverImage     String?      // URL aus Mediathek (Vercel Blob)
  category       BlogCategory @default(NEWS)
  tags           String[]     @default([])
  status         BlogStatus   @default(DRAFT)
  seoTitle       String?
  seoDescription String?
  publishedAt    DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  userId         String
  user           User         @relation(fields: [userId], references: [id])
}
```

### User-Model erweitern

```prisma
model User {
  // ... bestehende Felder ...
  cmsContents CmsContent[]
  blogPosts   BlogPost[]
}
```

---

## 2. API-Routes

### CMS Content (`/api/cms/content`)

**GET `/api/cms/content`**
- Query-Param: `locale` (optional, default "de")
- Gibt alle CmsContent-Einträge für die Locale als Key-Value-Map zurück
- Kein Auth nötig (public, wird von Landing-Page gelesen)

**PUT `/api/cms/content`**
- Body: `{ key, value, locale }`
- Auth: Session erforderlich (Admin)
- Erstellt oder aktualisiert (Upsert auf `[key, locale]`)

### Blog (`/api/cms/blog`)

**GET `/api/cms/blog`**
- Query-Params: `status` (DRAFT/PUBLISHED), `category`, `limit`
- Public: Gibt nur PUBLISHED zurück
- Auth (Dashboard): Gibt alle zurück

**POST `/api/cms/blog`**
- Body: `{ title, content, excerpt, coverImage, category, tags, status, seoTitle, seoDescription }`
- Auth: Session erforderlich
- Generiert `slug` aus `title` (slugify)
- Setzt `publishedAt` auf `now()` wenn `status === PUBLISHED`

**GET `/api/cms/blog/[id]`**
- Einzelner Post nach ID oder Slug

**PUT `/api/cms/blog/[id]`**
- Update eines Posts
- Wenn Status von DRAFT auf PUBLISHED wechselt → `publishedAt` setzen

**DELETE `/api/cms/blog/[id]`**
- Löscht Post (Auth erforderlich)

---

## 3. Dashboard-Seiten

### `/dashboard/inhalte` — Landing-Page-Editor

- Formular mit allen editierbaren Textblöcken
- DE/EN Tabs oben zum Umschalten der Locale
- Jeder Block: Label + Textarea (mehrzeilig für Texte, einzeilig für Titel/Buttons)
- "Speichern"-Button unten → PUT `/api/cms/content` für jeden geänderten Key
- "Vorschau"-Link → öffnet Landing-Page in neuem Tab
- Apple-Style: Weiße Cards mit rounded corners, dezente Schatten

### `/dashboard/blog` — Blog-Übersicht

- Liste aller Beiträge als Cards
- Status-Badge: "Entwurf" (grau) / "Veröffentlicht" (grün)
- Kategorie-Badge farbig
- Datum, Titel, Excerpt-Vorschau
- "Neuer Beitrag"-Button oben rechts
- Klick → `/dashboard/blog/[id]`

### `/dashboard/blog/neu` und `/dashboard/blog/[id]` — Editor

- **Titel**: großes Eingabefeld oben
- **Cover-Bild**: Klick öffnet Mediathek-Picker (Grid der hochgeladenen Bilder), URL wird gesetzt
- **Tiptap-Editor**: WYSIWYG mit Toolbar:
  - Überschriften (H2, H3)
  - Fett, Kursiv
  - Listen (Bullet, Nummeriert)
  - Bild einfügen (Mediathek-Picker)
  - Links
  - Blockquote
- **Seitenleiste** (Desktop) / Accordion (Mobile):
  - Kategorie (Dropdown: News, Saison, Rezept, Tipp)
  - Tags (Komma-separiertes Eingabefeld)
  - Excerpt (Textarea, max 200 Zeichen)
  - SEO-Titel (optional, Fallback auf Titel)
  - SEO-Beschreibung (optional, Fallback auf Excerpt)
- **Aktionen**:
  - "Als Entwurf speichern"
  - "Veröffentlichen"
  - "Löschen" (nur bei bestehenden Posts, mit Bestätigung)

### Mediathek-Picker (Shared Component)

- Modal/Drawer mit Grid aller Mediathek-Bilder
- Bestehende `/api/media` GET-Route nutzen
- Klick auf Bild → URL wird zurückgegeben
- Upload-Button im Picker → Bild hochladen und direkt auswählen

---

## 4. Öffentliche Seiten

### `/blog` — Blog-Übersicht

- Header: KörBee-Logo + Nav (wie Shop-Seiten)
- Titel: "Neuigkeiten aus der Imkerei"
- Kategorie-Filter als Pill-Buttons (Alle, News, Saison, Rezept, Tipp)
- Kachel-Grid (1 Spalte mobil, 2 tablet, 3 desktop):
  - Cover-Bild oben (Fallback: Honigwaben-Gradient)
  - Kategorie-Badge
  - Titel
  - Excerpt (2 Zeilen, truncated)
  - Datum formatiert (z.B. "15. September 2026")
- Design: Apple-Style wie Shop (gleiche CSS-Variablen, Manrope-Font, rounded Cards)
- Footer wie Landing-Page

### `/blog/[slug]` — Einzelner Beitrag

- Cover-Bild als Hero-Banner (volle Breite, max 400px Höhe)
- Kategorie-Badge + Datum
- Titel groß
- Tiptap-JSON gerendert als HTML
- "Zurück zur Übersicht" Link
- "Zum Shop" CTA am Ende
- SEO: `<title>` und `<meta description>` aus seoTitle/seoDescription

### Landing-Page (`/`) — Änderungen

- Texte aus `CmsContent` laden (Server-Side, Prisma-Query)
- Fallback auf hardcoded Texte wenn DB-Einträge fehlen (Migration-sicher)
- Neue Sektion vor dem Footer: "Neuigkeiten"
  - Letzte 3 Blog-Posts als Kacheln (Cover, Titel, Excerpt, Datum)
  - "Alle Beiträge →" Link zu `/blog`

### Shop (`/shop`) — News-Banner

- Zwischen Header und Hero: schmaler Banner
- Zeigt den neuesten PUBLISHED Blog-Post
- Format: "Neu: [Titel]" als Link zu `/blog/[slug]`
- Dezent gestylt, dismissbar (localStorage-Flag)
- Nur anzeigen wenn es einen Post gibt der max. 30 Tage alt ist

---

## 5. Navigation erweitern

### Sidebar (Desktop)

Zwei neue Einträge nach "Vorbestellungen":
- `{ label: 'Inhalte', href: '/dashboard/inhalte', icon: edit-pencil }`
- `{ label: 'Blog', href: '/dashboard/blog', icon: newspaper }`

### BottomNav — "Mehr"-Drawer

Zwei neue Einträge vor "Einstellungen":
- `{ label: 'Inhalte', href: '/dashboard/inhalte', icon: edit-pencil }`
- `{ label: 'Blog', href: '/dashboard/blog', icon: newspaper }`

### Öffentliche Navigation

- Footer auf Landing-Page + LegalPage: "Blog" Link hinzufügen
- Shop-Header: kein zusätzlicher Link (News-Banner reicht)

---

## 6. Packages

Neu zu installieren:
- `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-image` + `@tiptap/extension-link` + `@tiptap/extension-placeholder` — WYSIWYG-Editor
- `slugify` — Slug-Generierung aus Titeln

---

## 7. Dateien-Übersicht

### Neu erstellen:

| Datei | Zweck |
|-------|-------|
| `prisma/schema.prisma` | CmsContent + BlogPost Modelle hinzufügen |
| `src/app/api/cms/content/route.ts` | GET + PUT Landing-Page-Texte |
| `src/app/api/cms/blog/route.ts` | GET + POST Blog-Posts |
| `src/app/api/cms/blog/[id]/route.ts` | GET + PUT + DELETE einzelner Post |
| `src/app/dashboard/inhalte/page.tsx` | Landing-Page-Editor |
| `src/app/dashboard/blog/page.tsx` | Blog-Übersicht |
| `src/app/dashboard/blog/neu/page.tsx` | Neuer Beitrag |
| `src/app/dashboard/blog/[id]/page.tsx` | Beitrag bearbeiten |
| `src/components/cms/TiptapEditor.tsx` | WYSIWYG-Editor Komponente |
| `src/components/cms/MediaPicker.tsx` | Mediathek-Auswahl Modal |
| `src/components/cms/TiptapRenderer.tsx` | Tiptap-JSON → HTML Renderer |
| `src/app/blog/page.tsx` | Öffentliche Blog-Übersicht |
| `src/app/blog/[slug]/page.tsx` | Öffentlicher Blog-Beitrag |
| `src/app/blog/layout.tsx` | Blog-Layout (Header, Fonts, Footer) |

### Bestehende Dateien ändern:

| Datei | Änderung |
|-------|----------|
| `src/app/page.tsx` | Texte aus CmsContent laden, Neuigkeiten-Sektion |
| `src/app/shop/page.tsx` | News-Banner einfügen |
| `src/components/Sidebar.tsx` | Inhalte + Blog Nav-Items |
| `src/components/BottomNav.tsx` | Inhalte + Blog im Mehr-Drawer |
