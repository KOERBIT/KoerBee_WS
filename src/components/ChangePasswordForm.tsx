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
      const response = await fetch('/api/account/change-password', {
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
