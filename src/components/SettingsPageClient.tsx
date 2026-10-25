'use client'

import { useState } from 'react'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import CreateUserModal from '@/components/CreateUserModal'
import PayPalSettingsForm from '@/components/PayPalSettingsForm'
import MailSettingsForm from '@/components/MailSettingsForm'
import AnthropicSettingsForm from '@/components/AnthropicSettingsForm'
import ThemeSwitcher from '@/components/ThemeSwitcher'

type ManagedUser = { id: string; email: string; name: string | null; role: string; disabled: boolean }

interface SettingsPageClientProps {
  users: ManagedUser[]
  currentUserEmail: string | undefined
  currentUserId?: string
  isAdmin?: boolean
}

export default function SettingsPageClient({
  users: initialUsers,
  currentUserEmail,
  currentUserId,
  isAdmin = false,
}: SettingsPageClientProps) {
  const [usersList, setUsersList] = useState(initialUsers)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [userError, setUserError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function updateUser(id: string, body: Record<string, unknown>): Promise<boolean> {
    setUserError('')
    setBusyId(id)
    try {
      const res = await fetch(`/api/account/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUserError(data.error || 'Änderung fehlgeschlagen')
        return false
      }
      if (data.user) setUsersList((list) => list.map((u) => (u.id === id ? { ...u, ...data.user } : u)))
      return true
    } catch {
      setUserError('Änderung fehlgeschlagen')
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function resetPassword(user: ManagedUser) {
    const pw = window.prompt(`Neues Passwort für ${user.email} (mindestens 8 Zeichen):`)
    if (!pw) return
    if (await updateUser(user.id, { password: pw })) window.alert('Passwort wurde gesetzt.')
  }

  async function deleteUser(user: ManagedUser) {
    if (!window.confirm(`${user.email} wirklich löschen?\n\nAlle Daten dieses Nutzers (Völker, Verkäufe, Produkte …) werden unwiderruflich gelöscht.`)) return
    setUserError('')
    setBusyId(user.id)
    try {
      const res = await fetch(`/api/account/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUserError(data.error || 'Löschen fehlgeschlagen')
        return
      }
      setUsersList((list) => list.filter((u) => u.id !== user.id))
    } finally {
      setBusyId(null)
    }
  }

  const handleUserCreated = async () => {
    // Reload users list
    const response = await fetch('/api/account/list-users')
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

      {/* Design-Theme */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">Design-Theme</h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">Wähle das Aussehen deiner Verwaltung</p>
        </div>
        <div className="px-5 py-5">
          <ThemeSwitcher />
        </div>
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

      {/* PayPal */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">PayPal-Anbindung</h2>
        </div>
        <div className="px-5 py-6">
          <PayPalSettingsForm />
        </div>
      </div>

      {/* Beleg-Erkennung (Claude) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">Beleg-Erkennung (Claude/Anthropic)</h2>
        </div>
        <div className="px-5 py-6">
          <AnthropicSettingsForm />
        </div>
      </div>

      {/* E-Mail-Postfach (PayPal-Mails) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">E-Mail-Postfach (PayPal-Zahlungsmails)</h2>
        </div>
        <div className="px-5 py-6">
          <MailSettingsForm />
        </div>
      </div>

      {/* Nutzer verwalten (nur Admins) */}
      {isAdmin && (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">Nutzer verwalten</h2>
        </div>
        <div className="px-5 py-6">
          {usersList.length === 0 ? (
            <p className="text-[13px] text-zinc-400 mb-4">Keine Nutzer vorhanden</p>
          ) : (
            <div className="mb-4 space-y-2">
              {usersList.map((user) => {
                const isSelf = user.id === currentUserId
                const busy = busyId === user.id
                return (
                  <div
                    key={user.id}
                    className={`px-3 py-2 rounded-lg bg-zinc-50 ${user.disabled ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-zinc-900 truncate">
                          {user.email}
                          {isSelf && <span className="ml-2 text-[11px] text-zinc-400">(du)</span>}
                          {user.disabled && (
                            <span className="ml-2 text-[11px] font-medium text-red-600">gesperrt</span>
                          )}
                        </p>
                        {user.name && <p className="text-[12px] text-zinc-400 mt-0.5">{user.name}</p>}
                      </div>
                      <select
                        value={user.role}
                        disabled={isSelf || busy}
                        onChange={(e) => updateUser(user.id, { role: e.target.value })}
                        aria-label={`Rolle von ${user.email}`}
                        className="text-[13px] border border-zinc-200 rounded-lg px-2 py-1 bg-white disabled:bg-zinc-100"
                      >
                        <option value="user">Nutzer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    {!isSelf && (
                      <div className="flex gap-3 mt-2 text-[12px]">
                        <button
                          disabled={busy}
                          onClick={() => updateUser(user.id, { disabled: !user.disabled })}
                          className="text-amber-600 hover:underline disabled:opacity-50"
                        >
                          {user.disabled ? 'Entsperren' : 'Sperren'}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => resetPassword(user)}
                          className="text-amber-600 hover:underline disabled:opacity-50"
                        >
                          Passwort setzen
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => deleteUser(user)}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Löschen
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {userError && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {userError}
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
      )}

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  )
}
