'use client'

import { useState, useEffect, useCallback } from 'react'
import { QueensRegisterTable } from '@/components/QueensRegisterTable'

interface Queen {
  number: string
  hatchDate: string
  status: 'hatched' | 'mated' | 'distributed'
  lineName: string
  batchGraftDate: string
  motherColonyName: string | null
  notes: string | null
}

export default function QueensRegisterPage() {
  const [queens, setQueens] = useState<Queen[]>([])
  const [lines, setLines] = useState<{ id: string; name: string }[]>([])
  const [selectedLines, setSelectedLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'hatched' | 'mated' | 'distributed'>('all')

  const loadLines = useCallback(async () => {
    const res = await fetch('/api/breeding')
    const data = await res.json()
    setLines(data.map((line: any) => ({ id: line.id, name: line.name })))
  }, [])

  const loadQueens = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()

    if (selectedLines.length > 0) {
      params.append('lineIds', selectedLines.join(','))
    }
    if (statusFilter !== 'all') {
      params.append('status', statusFilter)
    }
    if (dateFrom) {
      params.append('dateFrom', dateFrom)
    }
    if (dateTo) {
      params.append('dateTo', dateTo)
    }

    const res = await fetch(`/api/breeding/queens?${params}`)
    const data = await res.json()
    setQueens(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [selectedLines, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    loadLines()
  }, [loadLines])

  useEffect(() => {
    loadQueens()
  }, [loadQueens])

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Königinnen-Register</h1>
        <p className="text-zinc-500 text-[14px] mt-1">{queens.length} Königinnen</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Lines filter */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-2">Zuchtreihen</label>
            <select
              multiple
              value={selectedLines}
              onChange={e =>
                setSelectedLines(Array.from(e.target.selectedOptions, opt => opt.value))
              }
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {lines.map(line => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">Alle</option>
              <option value="hatched">Geschlüpft</option>
              <option value="mated">Begattet</option>
              <option value="distributed">Verteilt</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-2">Von</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-500 mb-2">Bis</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedLines([])
              setStatusFilter('all')
              setDateFrom('')
              setDateTo('')
            }}
            className="px-3 py-2 text-[12px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            Filter zurücksetzen
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <QueensRegisterTable queens={queens} loading={loading} />
      </div>
    </div>
  )
}
