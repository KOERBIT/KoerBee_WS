'use client'

import { useState } from 'react'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import CreateUserModal from '@/components/CreateUserModal'
import PayPalSettingsForm from '@/components/PayPalSettingsForm'
import MailSettingsForm from '@/components/MailSettingsForm'
import AnthropicSettingsForm from '@/components/AnthropicSettingsForm'

interface SettingsPageClientProps {
  users: Array<{ id: string; email: string; name: string | null }>
  currentUserEmail: string | undefined
  isAdmin?: boolean
}

export default function SettingsPageClient({
  users: initialUsers,
  currentUserEmail,
  isAdmin = false,
}: SettingsPageClientProps) {
  const [usersList, setUsersList] = useState(initialUsers)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

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
      )}

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  )
}
