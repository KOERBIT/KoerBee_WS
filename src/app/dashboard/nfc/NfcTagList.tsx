'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

const ACTION_LABELS: Record<string, string> = {
  inspection:    'Durchschau',
  varroa:        'Varroa Behandlung',
  feeding:       'Füttern',
  honey_harvest: 'Honigernte',
}

interface NfcAction {
  id: string
  type: string
  defaultValues: Record<string, unknown> | null
}

interface Tag {
  id: string
  uid: string
  label: string | null
  colony: { id: string; name: string; apiary: { name: string } }
  actions: NfcAction[]
}

export function NfcTagList({ tags }: { tags: Tag[] }) {
  const router = useRouter()

  async function deleteTag(id: string) {
    if (!confirm('Tag wirklich löschen?')) return
    await fetch(`/api/nfc/tags/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  if (tags.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6"/>
            <circle cx="12" cy="12" r="1" fill="#3b82f6"/>
          </svg>
        </div>
        <p className="text-[15px] font-medium text-zinc-900">Noch keine Tags</p>
        <p className="text-[13px] text-zinc-400 mt-1">Registriere deinen ersten NFC-Chip</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tags.map((tag) => (
        <div key={tag.id} className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <code className="text-[12px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-lg">{tag.uid}</code>
                {tag.label && <span className="text-[13px] font-medium text-zinc-700">{tag.label}</span>}
              </div>
              <p className="text-[14px] font-semibold text-zinc-900 mt-1.5">
                <Link href={`/dashboard/colonies/${tag.colony.id}`} className="hover:text-amber-600 transition-colors">
                  {tag.colony.name}
                </Link>
              </p>
              <p className="text-[12px] text-zinc-400">{tag.colony.apiary.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/nfc/scan" className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[12px] font-medium hover:bg-amber-100 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6.5 6.5a6 6 0 000 11M9 9a3 3 0 000 6M17.5 6.5a6 6 0 010 11M15 9a3 3 0 010 6"/>
                  <circle cx="12" cy="12" r="1" fill="currentColor"/>
                </svg>
                Scannen
              </Link>
              <button onClick={() => deleteTag(tag.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
          {tag.actions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-50">
              {tag.actions.map(a => (
                <span key={a.id} className="text-[11px] font-medium bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
                  {ACTION_LABELS[a.type] ?? a.type}
                  {a.defaultValues?.amount ? ` (${String(a.defaultValues.amount)} ${String(a.defaultValues.unit ?? '')})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
