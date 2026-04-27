'use client'

import { useState } from 'react'
import { EditInspectionButton, DeleteInspectionButton } from './InspectionActions'

interface Colony { id: string; name: string; apiary: { name: string } }

interface InspectionRowMenuProps {
  inspection: any
  colonies: Colony[]
}

export function InspectionRowMenu({ inspection, colonies }: InspectionRowMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-zinc-200 z-40 w-40">
          <div className="py-1">
            <div className="px-3 py-2">
              <EditInspectionButton inspection={inspection} colonies={colonies} />
            </div>
            <div className="px-3 py-2 border-t border-zinc-100">
              <DeleteInspectionButton inspectionId={inspection.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
