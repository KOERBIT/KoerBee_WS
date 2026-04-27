'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface EventInputModalProps {
  isOpen: boolean
  onClose: () => void
  eventType: string
  eventLabel: string
  batchId: string
  eventId: string
  inputLabel: string
  currentValue?: number
  currentNotes?: string
}

export function EventInputModal({
  isOpen,
  onClose,
  eventType,
  eventLabel,
  batchId,
  eventId,
  inputLabel,
  currentValue,
  currentNotes,
}: EventInputModalProps) {
  const [value, setValue] = useState(currentValue?.toString() ?? '')
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return

    setLoading(true)
    try {
      await fetch(`/api/breeding/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventValue: parseInt(value),
          eventNotes: notes || null,
          completed: true,
        }),
      })
      setValue('')
      setNotes('')
      onClose()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">{eventLabel}</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">
              {inputLabel} *
            </label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">
              Kommentar (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="z.B. '3 deformiert', '1 nicht begattet', etc."
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="flex-1 px-4 py-2 text-[13px] font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Wird gespeichert…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
