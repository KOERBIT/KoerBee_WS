# NextAuth Setup — Design Spec

**Datum:** 2026-04-01
**Projekt:** Bee (Imkerei-Verwaltungs-App)

## Zusammenfassung

Einrichtung von NextAuth mit Credentials-Provider (Email + Passwort) für die Bee-App. Alle Routen außer `/login` sind geschützt. Nach Login wird zu `/dashboard` weitergeleitet.

## Scope

- Login-Seite (`/login`)
- NextAuth API-Route (`/api/auth/[...nextauth]`)
- Middleware für Routenschutz
- Dashboard-Platzhalter (`/dashboard`)
- **Kein** Register-Flow
- **Kein** Rate-Limiting (spätere Erweiterung)

## Dateien

```
src/
  app/
    api/
      auth/
        [...nextauth]/
          route.ts        ← NextAuth Handler (GET + POST)
    login/
      page.tsx            ← Login-Formular
    dashboard/
      page.tsx            ← Platzhalter nach Login
    layout.tsx            ← SessionProvider wrappen
  lib/
    auth.ts               ← NextAuth authOptions
middleware.ts             ← Routenschutz (Root-Level)
```

## Architektur

### `src/lib/auth.ts`
Enthält `authOptions`:
- `CredentialsProvider` mit Email + Passwort
- Prisma-Lookup des Users per Email
- Passwortvergleich via `bcrypt.compare()`
- `PrismaAdapter` für Session-Persistierung
- `session: { strategy: "jwt" }` für einfaches Token-Handling

### `middleware.ts`
- Läuft auf Edge Runtime
- Prüft JWT-Token aus Cookie via `getToken()`
- Kein Token → Redirect zu `/login`
- Ausnahmen: `/login` und NextAuth-interne Routen (`/api/auth/*`)

### Login-Seite
- Email-Feld + Passwort-Feld + Login-Button
- Fehlermeldung bei falschen Credentials: "E-Mail oder Passwort falsch"
- Minimales Tailwind-Styling, zentriert

### Dashboard
- Einfache Platzhalter-Seite
- Zeigt den eingeloggten User-Namen an
- Logout-Button

## Datenfluss

1. User öffnet `/dashboard` → Middleware prüft Session → kein Token → Redirect zu `/login`
2. User gibt Email + Passwort ein → POST an `/api/auth/callback/credentials`
3. NextAuth ruft `authorize()` auf → Prisma sucht User per Email → `bcrypt.compare()`
4. Bei Erfolg: JWT gesetzt → Redirect zu `/dashboard`
5. Alle weiteren Requests: Middleware liest JWT → gültig → Zugriff erlaubt

## Sicherheit

- Passwörter mit `bcrypt` (saltRounds: 12) gehasht — niemals Plaintext gespeichert
- Generische Fehlermeldung bei falschen Credentials (kein Hinweis ob Email oder Passwort falsch)
- `NEXTAUTH_SECRET` in `.env.local` (bereits vorhanden)

## Abhängigkeiten

Bereits installiert:
- `next-auth`
- `@next-auth/prisma-adapter`
- `@prisma/client`

Noch zu installieren:
- `bcryptjs` + `@types/bcryptjs`
