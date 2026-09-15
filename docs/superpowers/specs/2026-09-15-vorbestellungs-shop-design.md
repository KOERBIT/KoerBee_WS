# Vorbestellungs-Shop für KörBee

**Datum:** 2026-09-15
**Status:** Design abgenommen

## Übersicht

Öffentlicher Vorbestellungs-Shop als Subdomain (`shop.domain.de`) innerhalb der bestehenden Next.js-App. Kunden registrieren sich separat, bestellen Imkerei-Produkte vor und bezahlen bei Abholung. Admin verwaltet Bestellungen im bestehenden Dashboard.

## Anforderungen

- Eigene Subdomain mit eigenem Marken-Design (Landing Page, Logo, Produktbilder)
- Separates Kunden-Auth-System (`ShopCustomer`, eigenes JWT, kein NextAuth)
- Produkte aus bestehendem Kassenbuch + zusätzliche Shop-only-Produkte
- Einfache Bestellung: Produkt + Anzahl, keine Varianten
- Keine Online-Bezahlung — Bezahlung bei Abholung
- Statusverfolgung im Kunden-Portal + E-Mail-Benachrichtigung
- Admin-Dashboard: Bestellliste, Statusänderung, Statistiken
- Deutsch + Englisch (i18n)

## Datenmodell

### Product (bestehend, erweitern)

```
+ shopVisible    Boolean   @default(false)   // Im Shop anzeigen?
+ shopName       String?                      // Alternativer Shop-Name
+ shopNameEn     String?                      // Englischer Name
+ description    String?                      // Shop-Beschreibung DE
+ descriptionEn  String?                      // Shop-Beschreibung EN
+ imageUrl       String?                      // Produktbild-URL
+ shopPrice      Decimal?                     // Shop-Preis (kann vom Kassenbuch-Preis abweichen)
+ shopSortOrder  Int       @default(0)        // Reihenfolge im Shop
```

### ShopCustomer (neu)

```
id              String    @id @default(cuid())
email           String    @unique
passwordHash    String
name            String
phone           String?
locale          String    @default("de")      // "de" | "en"
emailVerified   Boolean   @default(false)
createdAt       DateTime  @default(now())
updatedAt       DateTime  @updatedAt
```

### PreOrder (neu)

```
id              String         @id @default(cuid())
shopCustomerId  String         → ShopCustomer
status          PreOrderStatus @default(PENDING)
note            String?        // Kundennotiz
adminNote       String?        // Interne Notiz
createdAt       DateTime       @default(now())
updatedAt       DateTime       @updatedAt
statusChangedAt DateTime       @default(now())
```

### PreOrderItem (neu)

```
id              String   @id @default(cuid())
preOrderId      String   → PreOrder
productId       String   → Product
quantity        Int
priceAtOrder    Decimal  // Preis zum Bestellzeitpunkt eingefroren
```

### PreOrderStatus (enum)

```
PENDING      // Eingegangen
CONFIRMED    // Bestätigt
READY        // Abholbereit
PICKED_UP    // Abgeholt
CANCELLED    // Storniert
```

## Authentifizierung

### Zwei getrennte Auth-Systeme

**Shop-Kunden:**
- Custom JWT-Auth mit `ShopCustomer`-Tabelle
- JWT in `shop-token`-Cookie (HttpOnly, Secure, SameSite=Lax)
- E-Mail-Verifizierung nach Registrierung (Nodemailer)
- Passwort-Reset per E-Mail
- Passwörter mit bcryptjs gehasht

**Admin:**
- NextAuth bleibt unverändert

### API-Routen

```
/api/shop/auth/register     POST   Registrierung
/api/shop/auth/login        POST   Login
/api/shop/auth/logout       POST   Logout
/api/shop/auth/verify-email GET    E-Mail-Verifizierung
/api/shop/auth/reset-password POST Passwort-Reset anfordern
/api/shop/auth/new-password POST   Neues Passwort setzen
/api/shop/auth/me           GET    Aktueller Kunde

/api/shop/products          GET    Shop-Produkte (öffentlich)
/api/shop/orders            GET    Meine Bestellungen (auth)
/api/shop/orders            POST   Vorbestellung aufgeben (auth)
/api/shop/orders/[id]       GET    Bestelldetail (auth)

/api/admin/preorders        GET    Alle Vorbestellungen (admin-auth)
/api/admin/preorders/[id]   GET    Bestelldetail (admin-auth)
/api/admin/preorders/[id]/status PATCH Status ändern (admin-auth)
/api/admin/preorders/stats  GET    Statistiken (admin-auth)
```

## Routing & Middleware

### Middleware-Logik

```
Request → Host prüfen:

shop.domain.de:
  /shop/konto/*        → shop-token prüfen, sonst → /shop/login
  /shop/*              → öffentlich
  /api/shop/orders/*   → shop-token prüfen
  /api/shop/auth/*     → öffentlich
  /api/shop/products   → öffentlich (nur GET)

domain.de:
  → bestehende NextAuth-Middleware (unverändert)
```

### Ordnerstruktur

```
src/app/
  shop/                         ← Shop-Layout (eigenes Branding)
    layout.tsx                  ← Shop-Shell: Header, Footer, i18n-Provider
    page.tsx                    ← Landing Page
    produkte/page.tsx           ← Produktübersicht
    login/page.tsx
    registrieren/page.tsx
    passwort-vergessen/page.tsx
    konto/
      layout.tsx                ← Auth-geschützt
      page.tsx                  ← Meine Bestellungen
      bestellung/[id]/page.tsx  ← Bestelldetail
      profil/page.tsx           ← Profil bearbeiten
    warenkorb/page.tsx          ← Warenkorb + Bestellabschluss
  dashboard/                    ← Bestehendes Admin
    vorbestellungen/            ← NEU
      page.tsx                  ← Bestellliste + Statistiken
      [id]/page.tsx             ← Bestelldetail mit Status-Workflow
```

## Shop-Frontend

### Landing Page (`/shop`)
- Hero-Bereich mit Imkerei-Bild/Logo, Willkommenstext
- Highlight-Produkte (erste 3-4)
- "Jetzt vorbestellen"-CTA → Produktübersicht
- Footer mit Kontaktinfos, Impressum-Link

### Produktübersicht (`/shop/produkte`)
- Grid/Karten-Layout: Produktbild, Name, Preis, Kurzbeschreibung
- Sortiert nach `shopSortOrder`
- "Vorbestellen"-Button → Mengen-Auswahl
- Warenkorb im LocalStorage
- Warenkorb-Icon im Header mit Anzahl-Badge

### Warenkorb & Bestellabschluss (`/shop/warenkorb`)
- Produkte, Mengen ändern/entfernen, Gesamtpreis
- "Vorbestellung absenden" → nur für eingeloggte Kunden
- Nicht eingeloggt → Redirect zu Login, danach zurück
- Nach Absenden: Bestätigungsseite + E-Mail

### Kunden-Portal (`/shop/konto`)
- Bestellliste mit Status-Badges (farbcodiert)
- Bestelldetail: Produkte, Mengen, Preise, Status, Zeitverlauf
- Profil: Name, Telefon, Passwort, Sprache DE/EN

### i18n
- Key-Value-Übersetzungsdateien: `src/shop/locales/de.json`, `en.json`
- Sprachauswahl im Shop-Header (DE/EN Toggle)
- Sprache gespeichert in `ShopCustomer.locale` (eingeloggt) oder Cookie (Gast)

## Admin-Dashboard

### Bestellliste (`/dashboard/vorbestellungen`)

**Statistik-Karten (oben):**
- Offene Bestellungen
- Abholbereit
- Diese Woche abgeholt

**Produkt-Zusammenfassung:**
- Pro Produkt: Vorbestellt gesamt, davon offen/bestätigt/abholbereit/abgeholt

**Tabelle:**
- Spalten: Bestellnr., Kunde, Datum, Positionen, Gesamtwert, Status
- Filter nach Status
- Suchfeld (Name, E-Mail)

### Bestelldetail (`/dashboard/vorbestellungen/[id]`)
- Kundeninfos (Name, E-Mail, Telefon)
- Positionen: Produkt, Menge, Preis
- Status-Workflow-Buttons:
  - PENDING → "Bestätigen" / "Stornieren"
  - CONFIRMED → "Abholbereit melden"
  - READY → "Als abgeholt markieren"
- Admin-Notizfeld
- Statusverlauf mit Zeitstempeln

## E-Mail-Benachrichtigungen

Automatisch bei Statusänderung, in der Sprache des Kunden:

| Trigger | Betreff (DE) | Betreff (EN) |
|---------|-------------|-------------|
| Bestellung aufgegeben | "Deine Vorbestellung ist eingegangen" | "Your pre-order has been received" |
| CONFIRMED | "Deine Vorbestellung wurde bestätigt" | "Your pre-order has been confirmed" |
| READY | "Deine Bestellung ist abholbereit!" | "Your order is ready for pickup!" |
| CANCELLED | "Deine Vorbestellung wurde storniert" | "Your pre-order has been cancelled" |
| Registrierung | "Bitte bestätige deine E-Mail-Adresse" | "Please verify your email address" |
| Passwort-Reset | "Passwort zurücksetzen" | "Reset your password" |

Versand über bestehende Nodemailer-Integration (`MailCredential`).

## Technische Entscheidungen

- **Mono-App:** Eine Next.js-App für beide Subdomains, Host-basiertes Routing in der Middleware
- **Shop-Auth:** Custom JWT (kein NextAuth) für saubere Trennung, bcryptjs für Passwort-Hashing
- **Warenkorb:** Client-seitig im LocalStorage, kein Server-State
- **Bilder:** `imageUrl` auf Product — Upload-Lösung TBD (Vercel Blob oder Supabase Storage)
- **Preise einfrieren:** `priceAtOrder` in PreOrderItem speichert den Preis zum Bestellzeitpunkt
- **i18n:** Einfache JSON-Dateien, kein Framework (next-intl etc.) — Scope ist nur der Shop
