'use client'

import { useState } from 'react'

interface Queen {
  number: string
  hatchDate: string
  status: 'hatched' | 'mated' | 'distributed'
  lineName: string
  batchGraftDate: string
  motherColonyName: string | null
  notes: string | null
}

interface QueensRegisterTableProps {
  queens: Queen[]
  loading?: boolean
  onStatusChange?: (number: string, newStatus: 'hatched' | 'mated' | 'distributed') => void
}

function statusBadge(status: string) {
  switch (status) {
    case 'hatched':
      return 'bg-green-100 text-green-700'
    case 'mated':
      return 'bg-amber-100 text-amber-700'
    case 'distributed':
      return 'bg-zinc-100 text-zinc-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'hatched':
      return 'Geschlüpft'
    case 'mated':
      return 'Begattet'
    case 'distributed':
      return 'Verteilt'
    default:
      return status
  }
}

export function QueensRegisterTable({ queens, loading = false, onStatusChange }: QueensRegisterTableProps) {
  const [sortBy, setSortBy] = useState<'number' | 'date' | 'line'>('date')
  const [sortAsc, setSortAsc] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  if (queens.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p className="text-[14px]">Noch keine Königinnen geschlüpft</p>
      </div>
    )
  }

  const sortedQueens = [...queens].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'number') {
      cmp = a.number.localeCompare(b.number)
    } else if (sortBy === 'date') {
      cmp = new Date(a.hatchDate).getTime() - new Date(b.hatchDate).getTime()
    } else {
      cmp = a.lineName.localeCompare(b.lineName)
    }
    return sortAsc ? cmp : -cmp
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-zinc-200">
            <th
              className="px-4 py-3 text-left font-semibold text-zinc-700 cursor-pointer hover:bg-zinc-50"
              onClick={() => {
                setSortBy('number')
                setSortAsc(sortBy === 'number' ? !sortAsc : false)
              }}
            >
              <div className="flex items-center gap-1">
                Nummer
                {sortBy === 'number' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polyline points={sortAsc ? '6 9 12 15 18 9' : '18 15 12 9 6 15'} />
                  </svg>
                )}
              </div>
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-zinc-700 cursor-pointer hover:bg-zinc-50"
              onClick={() => {
                setSortBy('date')
                setSortAsc(sortBy === 'date' ? !sortAsc : false)
              }}
            >
              <div className="flex items-center gap-1">
                Schlupfdatum
                {sortBy === 'date' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polyline points={sortAsc ? '6 9 12 15 18 9' : '18 15 12 9 6 15'} />
                  </svg>
                )}
              </div>
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-zinc-700 cursor-pointer hover:bg-zinc-50"
              onClick={() => {
                setSortBy('line')
                setSortAsc(sortBy === 'line' ? !sortAsc : false)
              }}
            >
              <div className="flex items-center gap-1">
                Zuchtreihe
                {sortBy === 'line' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polyline points={sortAsc ? '6 9 12 15 18 9' : '18 15 12 9 6 15'} />
                  </svg>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Muttervolk</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Notizen</th>
          </tr>
        </thead>
        <tbody>
          {sortedQueens.map((queen, idx) => (
            <tr key={queen.number} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
              <td className="px-4 py-3 font-mono text-zinc-900">{queen.number}</td>
              <td className="px-4 py-3 text-zinc-600">
                {new Date(queen.hatchDate).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </td>
              <td className="px-4 py-3 text-zinc-600">{queen.lineName}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-[12px] font-medium ${statusBadge(queen.status)}`}>
                  {statusLabel(queen.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-600">{queen.motherColonyName || '—'}</td>
              <td className="px-4 py-3 text-zinc-400 text-[12px]">{queen.notes ? queen.notes.substring(0, 30) + '...' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
