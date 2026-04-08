# Design: Passwort-Änderung + User-Management

**Date:** 2026-04-08  
**Scope:** Settings-Seite mit Passwort-Änderung + User-Anlegen  
**Status:** Approved

## Overview

Erweitere `src/app/dashboard/settings/page.tsx` um zwei Features:
1. **Passwort-Änderung:** User ändert sein eigenes Passwort in den Settings
2. **User-Management:** User kann neue Accounts mit Email + Passwort anlegen

Beide Features sind in der Settings-Seite integriert — keine separaten Seiten nötig.

## UI Layout

Settings-Seite wird in drei Sections gegliedert:

```
┌─────────────────────────────────────┐
│ Konto                               │
├─────────────────────────────────────┤
│ Name: Max Müller                    │
│ E-Mail: max@bee.local               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Passwort                            │
├─────────────────────────────────────┤
│ [Input] Aktuelles Passwort          │
│ [Input] Neues Passwort              │
│ [Input] Neues Passwort (wiederholen)│
│ [Button] Passwort ändern            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Nutzer verwalten                    │
├─────────────────────────────────────┤
│ Nutzer-Liste:                       │
│ • admin@bee.local                   │
│ • imker2@bee.local                  │
│                                     │
│ [Button] Neuen Nutzer anlegen       │
└─────────────────────────────────────┘
```

**Modal für Nutzer-Anlegen:**
```
[X] Neuen Nutzer anlegen

[Input] E-Mail-Adresse
[Input] Passwort
[Input] Passwort (wiederholen)

[Button] Abbrechen  [Button] Erstellen
```

## Feature 1: Passwort-Änderung

### User Flow
1. User öffnet Settings
2. Füllt Passwort-Form aus: aktuelles + neues Passwort (2x)
3. Klickt "Passwort ändern"
4. System validiert, bcrypt hasht neues Passwort, speichert es
5. Toast: "Passwort erfolgreich geändert"
6. Session bleibt bestehen (kein Re-Login nötig)

### Validierung
- **Aktuelles Passwort:** Muss korrekt sein (bcrypt-Vergleich)
- **Neues Passwort:** Min. 8 Zeichen, darf nicht leer sein
- **Wiederholen:** Muss mit "Neues Passwort" übereinstimmen
- **Error-Cases:**
  - Aktuelles Passwort falsch → "Passwort falsch"
  - Passwörter stimmen nicht überein → "Passwörter stimmen nicht überein"
  - Passwort zu kurz → "Mindestens 8 Zeichen"

### API Endpoint
**POST `/api/auth/change-password`**

```typescript
// Request
{
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Response (Success)
{
  success: true
  message: "Passwort geändert"
}

// Response (Error)
{
  success: false
  error: "Passwort falsch" | "Passwörter stimmen nicht überein" | string
}
```

**Implementierung:**
- Require Session (`getServerSession`)
- Load current user from Prisma
- Verify current password with bcrypt.compare()
- Hash new password with bcrypt
- Update user.passwordHash in Prisma
- Return success/error

## Feature 2: User-Management (Anlegen)

### User Flow
1. User klickt "Neuen Nutzer anlegen" in Settings
2. Modal öffnet sich
3. Füllt E-Mail + Passwort aus
4. Klickt "Erstellen"
5. System validiert, erstellt User mit bcrypt-Hash
6. Nutzer erscheint in der Liste
7. Toast: "Nutzer erstellt"

### Validierung
- **E-Mail:** Muss valid sein, darf nicht existieren
- **Passwort:** Min. 8 Zeichen, darf nicht leer sein
- **Wiederholen:** Muss mit Passwort übereinstimmen
- **Error-Cases:**
  - E-Mail existiert bereits → "E-Mail existiert bereits"
  - Passwort zu kurz → "Mindestens 8 Zeichen"
  - Passwörter stimmen nicht → "Passwörter stimmen nicht überein"

### API Endpoint
**POST `/api/auth/create-user`**

```typescript
// Request
{
  email: string
  password: string
  confirmPassword: string
}

// Response (Success)
{
  success: true
  user: {
    id: string
    email: string
    name: string | null
  }
}

// Response (Error)
{
  success: false
  error: "E-Mail existiert bereits" | "Passwort zu kurz" | string
}
```

**Implementierung:**
- Require Session (`getServerSession`)
- Check if email exists → return error
- Hash password with bcrypt
- Create user via Prisma (`prisma.user.create()`)
- Return created user (ohne Passwort)

### List Existing Users
- Auf der Settings-Seite: alle User aus DB auflisten (nur Email)
- Server-Side Render (`getServerSession` + `prisma.user.findMany()`)
- Einfache Liste ohne Edit/Delete für jetzt

## Implementation Order

1. **Passwort-Änderung**
   - API Route `/api/auth/change-password`
   - Settings-Form (client-side)
   - Validation & error handling

2. **User-Anlegen**
   - API Route `/api/auth/create-user`
   - Modal-Component (client-side)
   - Settings-Form: Liste + Button
   - Nutzer-Liste refreshen nach Erfolg

3. **Settings-Seite Update**
   - Neue Sections integrieren
   - Bestehende "Konto"-Section bleibt

## Files to Touch

```
src/app/api/auth/change-password.ts        (NEW)
src/app/api/auth/create-user.ts            (NEW)
src/app/dashboard/settings/page.tsx        (MODIFY)
src/components/CreateUserModal.tsx         (NEW, optional)
src/components/ChangePasswordForm.tsx      (NEW, optional)
```

## Testing

- Manual test: Passwort ändern + Login mit neuem Passwort
- Manual test: Neuen User anlegen + mit diesem User einloggen
- Error cases: Falsche Passwörter, doppelte E-Mail, zu kurze Passwörter

## Success Criteria

✅ User kann sein Passwort ändern  
✅ User kann neue Accounts erstellen  
✅ Session bleibt nach Passwort-Änderung aktiv  
✅ Neue User können sich einloggen  
✅ Error-Cases werden korrekt gehandhabt  
