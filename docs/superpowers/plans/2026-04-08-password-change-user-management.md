# Passwort-Änderung + User-Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password change and user management features to the Settings page, allowing users to change their own passwords and create new user accounts.

**Architecture:** Two API routes handle validation and database operations; two client components (forms) provide the UI; Settings page integrates both with a list of existing users.

**Tech Stack:** Next.js 16, NextAuth v4, bcryptjs, Prisma v7, React

---

## File Structure

```
src/app/api/auth/change-password.ts    (NEW) - POST endpoint for password change
src/app/api/auth/create-user.ts        (NEW) - POST endpoint for user creation
src/app/api/auth/list-users.ts         (NEW) - GET endpoint for fetching user list
src/components/ChangePasswordForm.tsx  (NEW) - Client form component for password change
src/components/CreateUserModal.tsx     (NEW) - Client modal component for user creation
src/components/SettingsPageClient.tsx  (NEW) - Client component for settings page
src/app/dashboard/settings/page.tsx    (MODIFY) - Server component with data fetching
```

---

## Task 1: Create change-password API Route

**Files:**
- Create: `src/app/api/auth/change-password.ts`

- [ ] **Step 1: Create the file and write the handler**

```typescript
// src/app/api/auth/change-password.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json()

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Alle Felder erforderlich' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwörter stimmen nicht überein' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Mindestens 8 Zeichen' },
        { status: 400 }
      )
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Aktuelles Passwort falsch' },
        { status: 401 }
      )
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hashedPassword },
    })

    return NextResponse.json({
      success: true,
      message: 'Passwort erfolgreich geändert',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Ändern des Passworts' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/change-password.ts
git commit -m "feat: add POST /api/auth/change-password endpoint"
```

---

## Task 2: Create ChangePasswordForm Component

**Files:**
- Create: `src/components/ChangePasswordForm.tsx`

- [ ] **Step 1: Create the client component**

```typescript
// src/components/ChangePasswordForm.tsx
'use client'

import { useState } from 'react'

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Fehler beim Ändern des Passworts')
        return
      }

      setSuccess(data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError('Fehler beim Ändern des Passworts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[14px] font-medium text-zinc-900 mb-2">
          Aktuelles Passwort
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        />
      </div>

      <div>
        <label className="block text-[14px] font-medium text-zinc-900 mb-2">
          Neues Passwort
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        />
      </div>

      <div>
        <label className="block text-[14px] font-medium text-zinc-900 mb-2">
          Passwort wiederholen
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500"
          required
        />
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-[13px] text-green-700">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-[14px] font-medium transition-colors"
      >
        {loading ? 'Wird geändert...' : 'Passwort ändern'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChangePasswordForm.tsx
git commit -m "feat: add ChangePasswordForm component"
```

---

## Task 3: Create create-user API Route

**Files:**
- Create: `src/app/api/auth/create-user.ts`

- [ ] **Step 1: Create the file and write the handler**

```typescript
// src/app/api/auth/create-user.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { email, password, confirmPassword } = await request.json()

    // Validation
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Alle Felder erforderlich' },
        { status: 400 }
      )
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwörter stimmen nicht überein' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Mindestens 8 Zeichen' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'E-Mail existiert bereits' },
        { status: 409 }
      )
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: newUser,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Erstellen des Benutzers' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/create-user.ts
git commit -m "feat: add POST /api/auth/create-user endpoint"
```

---

## Task 4: Create CreateUserModal Component

**Files:**
- Create: `src/components/CreateUserModal.tsx`

- [ ] **Step 1: Create the client component**

```typescript
// src/components/CreateUserModal.tsx
'use client'

import { useState } from 'react'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: () => void
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated,
}: CreateUserModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Fehler beim Erstellen des Benutzers')
        return
      }

      setEmail('')
      setPassword('')
      setConfirmPassword('')
      onUserCreated()
      onClose()
    } catch (err) {
      setError('Fehler beim Erstellen des Benutzers')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:hidden bg-black/20">
      <div className="bg-white rounded-2xl shadow-xl w-full mx-4 p-6 max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-zinc-900">
            Neuen Nutzer anlegen
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-zinc-900 mb-2">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-zinc-900 mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-zinc-900 mb-2">
              Passwort wiederholen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 disabled:bg-zinc-100 text-zinc-700 rounded-lg text-[14px] font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-[14px] font-medium transition-colors"
            >
              {loading ? 'Wird erstellt...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CreateUserModal.tsx
git commit -m "feat: add CreateUserModal component"
```

---

## Task 5: Update Settings Page

**Files:**
- Create: `src/components/SettingsPageClient.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Create SettingsPageClient.tsx and update settings/page.tsx**

```typescript
// src/app/dashboard/settings/page.tsx
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SettingsPageClient from '@/components/SettingsPageClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  // Fetch all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <SettingsPageClient
      users={users}
      currentUserEmail={session?.user?.email}
    />
  )
}
```

**AND** Create `src/components/SettingsPageClient.tsx`:

```typescript
// src/components/SettingsPageClient.tsx
'use client'

import { useState } from 'react'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import CreateUserModal from '@/components/CreateUserModal'

interface SettingsPageClientProps {
  users: Array<{ id: string; email: string; name: string | null }>
  currentUserEmail: string | undefined
}

export default function SettingsPageClient({
  users: initialUsers,
  currentUserEmail,
}: SettingsPageClientProps) {
  const [usersList, setUsersList] = useState(initialUsers)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleUserCreated = async () => {
    // Reload users list
    const response = await fetch('/api/auth/list-users')
    const data = await response.json()
    if (data.success) {
      setUsersList(data.users)
    }
  }

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Einstellungen
        </h1>
        <p className="text-zinc-500 text-[14px] mt-1">Konto- und App-Einstellungen</p>
      </div>

      {/* Konto */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">Konto</h2>
        </div>
        <div className="divide-y divide-zinc-50">
          <div className="px-5 py-4">
            <p className="text-[14px] font-medium text-zinc-900">E-Mail</p>
            <p className="text-[13px] text-zinc-400 mt-0.5">{currentUserEmail ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Passwort */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">Passwort</h2>
        </div>
        <div className="px-5 py-6">
          <ChangePasswordForm />
        </div>
      </div>

      {/* Nutzer verwalten */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">Nutzer verwalten</h2>
        </div>
        <div className="px-5 py-6">
          {usersList.length === 0 ? (
            <p className="text-[13px] text-zinc-400 mb-4">Keine Nutzer vorhanden</p>
          ) : (
            <div className="mb-4 space-y-2">
              {usersList.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50">
                  <div>
                    <p className="text-[14px] font-medium text-zinc-900">{user.email}</p>
                    {user.name && (
                      <p className="text-[12px] text-zinc-400 mt-0.5">{user.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full px-4 py-2 border border-amber-200 hover:bg-amber-50 text-amber-600 rounded-lg text-[14px] font-medium transition-colors"
          >
            + Neuen Nutzer anlegen
          </button>
        </div>
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SettingsPageClient.tsx src/app/dashboard/settings/page.tsx
git commit -m "feat: integrate password change and user management on settings page"
```

---

## Task 6: Create list-users API Route (Helper)

**Files:**
- Create: `src/app/api/auth/list-users.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/auth/list-users.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden der Nutzer' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/list-users.ts
git commit -m "feat: add GET /api/auth/list-users endpoint"
```

---

## Task 7: Manual Testing

- [ ] **Step 1: Test password change flow**

1. Navigate to `/dashboard/settings`
2. Fill in password form (current + new + confirm)
3. Click "Passwort ändern"
4. Verify success message appears
5. Log out and try logging in with new password
6. Verify login works

- [ ] **Step 2: Test user creation flow**

1. Navigate to `/dashboard/settings`
2. Click "Neuen Nutzer anlegen"
3. Fill in new user email + password
4. Click "Erstellen"
5. Verify user appears in the list below
6. Log out and test logging in with new user
7. Verify new user can access dashboard

- [ ] **Step 3: Test error cases**

Test these scenarios:
- Wrong current password in password form
- Mismatched password confirmation
- Password less than 8 characters
- Email that already exists when creating user
- Invalid email format

- [ ] **Step 4: Final commit if everything passes**

```bash
git status
```

Verify all changes are committed.

---

## Success Criteria Checklist

- ✅ User can change their own password from Settings
- ✅ Session persists after password change (no re-login required)
- ✅ User can create new accounts with email + password
- ✅ New users can log in with their credentials
- ✅ All validation errors display appropriately
- ✅ Password change and user creation are integrated on one Settings page
