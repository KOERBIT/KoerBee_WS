'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InspectionForm } from './InspectionForm'

interface Colony { id: string; name: string; apiary: { name: string } }

export function AddInspectionButton({ colonies }: { colonies: Colony[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: any) {
    await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Neue Inspektion
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Neue Inspektion</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <InspectionForm
              colonies={colonies}
              onSubmit={handleSubmit}
              submitLabel="Inspektion speichern"
            />
          </div>
        </div>
      )}
    </>
  )
}

export function EditInspectionButton({
  inspection,
  colonies,
}: {
  inspection: any
  colonies: Colony[]
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: any) {
    await fetch(`/api/inspections/${inspection.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
      >
        Bearbeiten
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Inspektion bearbeiten</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <InspectionForm
              colonies={colonies}
              initialData={{
                colonyId: inspection.colonyId,
                date: new Date(inspection.date).toISOString().split('T')[0],
                notes: inspection.notes || '',
                items: inspection.items,
              }}
              onSubmit={handleSubmit}
              submitLabel="Änderungen speichern"
              isEditMode={true}
            />
          </div>
        </div>
      )}
    </>
  )
}

export function DeleteInspectionButton({
  inspectionId,
}: {
  inspectionId: string
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      await fetch(`/api/inspections/${inspectionId}`, {
        method: 'DELETE',
      })
      setShowConfirm(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        Löschen
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5">
              <p className="text-[15px] font-semibold text-zinc-900 mb-2">Inspektion löschen?</p>
              <p className="text-[14px] text-zinc-500">Das Löschen kann nicht rückgängig gemacht werden.</p>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-t border-zinc-100">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {loading ? 'Wird gelöscht…' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
