'use client'

import { useState, useEffect, useCallback } from 'react'

interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  completed: boolean
  priority: string
  colony: { id: string; name: string } | null
  apiary: { id: string; name: string } | null
}

interface Colony { id: string; name: string }
interface Apiary { id: string; name: string }

const PRIORITY_COLORS = {
  low:    { badge: 'bg-zinc-100 text-zinc-500',   dot: 'bg-zinc-400' },
  normal: { badge: 'bg-blue-100 text-blue-600',   dot: 'bg-blue-400' },
  high:   { badge: 'bg-rose-100 text-rose-600',   dot: 'bg-rose-500' },
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Mon=0
}

export default function CalendarPage() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [tasks, setTasks] = useState<Task[]>([])
  const [colonies, setColonies] = useState<Colony[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'normal', colonyId: '', apiaryId: '' })

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
  }, [])

  useEffect(() => {
    fetchTasks()
    fetch('/api/colonies').then(r => r.json()).then(setColonies)
    fetch('/api/apiaries').then(r => r.json()).then(setApiaries)
  }, [fetchTasks])

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
    else setCurrentMonth(m => m + 1)
  }

  function tasksForDate(dateStr: string) {
    return tasks.filter(t => t.dueDate?.startsWith(dateStr))
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, colonyId: form.colonyId || null, apiaryId: form.apiaryId || null, dueDate: form.dueDate || null }),
    })
    setLoading(false)
    setShowForm(false)
    setForm({ title: '', description: '', dueDate: '', priority: 'normal', colonyId: '', apiaryId: '' })
    fetchTasks()
  }

  async function toggleTask(id: string, completed: boolean) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed }),
    })
    fetchTasks()
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    fetchTasks()
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today)
  const upcomingTasks = tasks.filter(t => !t.completed).slice(0, 8)

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Kalender</h1>
          <p className="text-zinc-500 text-[14px] mt-1">{tasks.filter(t => !t.completed).length} offene Aufgaben</p>
        </div>
        <button onClick={() => { setForm(f => ({ ...f, dueDate: '' })); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Neue Aufgabe
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors text-zinc-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2 className="text-[15px] font-semibold text-zinc-900">{MONTHS[currentMonth]} {currentYear}</h2>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors text-zinc-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-zinc-100">
              {DAYS.map(d => (
                <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - firstDay + 1
                const isValid = dayNum >= 1 && dayNum <= daysInMonth
                const dateStr = isValid
                  ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  : ''
                const isToday = dateStr === today.toISOString().split('T')[0]
                const isSelected = dateStr === selectedDate
                const dayTasks = isValid ? tasksForDate(dateStr) : []

                return (
                  <div
                    key={i}
                    onClick={() => isValid && setSelectedDate(isSelected ? null : dateStr)}
                    className={`min-h-[72px] p-2 border-b border-r border-zinc-50 cursor-pointer transition-colors ${isValid ? 'hover:bg-amber-50/50' : ''} ${isSelected ? 'bg-amber-50' : ''}`}
                  >
                    {isValid && (
                      <>
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[13px] font-medium mb-1 ${isToday ? 'bg-amber-500 text-white' : 'text-zinc-700'}`}>
                          {dayNum}
                        </div>
                        <div className="space-y-0.5">
                          {dayTasks.slice(0, 2).map(t => (
                            <div key={t.id} className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium ${t.completed ? 'line-through opacity-40 bg-zinc-100 text-zinc-500' : PRIORITY_COLORS[t.priority as keyof typeof PRIORITY_COLORS]?.badge ?? 'bg-zinc-100 text-zinc-600'}`}>
                              {t.title}
                            </div>
                          ))}
                          {dayTasks.length > 2 && (
                            <div className="text-[10px] text-zinc-400 px-1">+{dayTasks.length - 2} weitere</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected day tasks */}
          {selectedDate && (
            <div className="bg-white rounded-2xl shadow-sm mt-4 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-zinc-900">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => { setForm(f => ({ ...f, dueDate: selectedDate })); setShowForm(true) }}
                  className="text-[12px] font-medium text-amber-600 hover:text-amber-700 transition-colors">
                  + Aufgabe
                </button>
              </div>
              {tasksForDate(selectedDate).length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-zinc-400">Keine Aufgaben an diesem Tag</p>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {tasksForDate(selectedDate).map(t => (
                    <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: upcoming + overdue */}
        <div className="space-y-4">
          {overdueTasks.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3.5 border-b border-zinc-100">
                <h3 className="text-[13px] font-semibold text-rose-600 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Überfällig ({overdueTasks.length})
                </h3>
              </div>
              <div className="divide-y divide-zinc-50">
                {overdueTasks.slice(0, 5).map(t => (
                  <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} compact />
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-100">
              <h3 className="text-[13px] font-semibold text-zinc-700">Offene Aufgaben</h3>
            </div>
            {upcomingTasks.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-zinc-400">Alles erledigt 🎉</p>
            ) : (
              <div className="divide-y divide-zinc-50">
                {upcomingTasks.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} compact />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Neue Aufgabe</h2>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddTask} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Titel *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="z.B. Varroa kontrollieren"
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Beschreibung</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Details..."
                  className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Fällig am</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Priorität</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                    <option value="low">Niedrig</option>
                    <option value="normal">Normal</option>
                    <option value="high">Hoch</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Standort</label>
                  <select value={form.apiaryId} onChange={e => setForm(f => ({ ...f, apiaryId: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                    <option value="">— keiner —</option>
                    {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Volk</label>
                  <select value={form.colonyId} onChange={e => setForm(f => ({ ...f, colonyId: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                    <option value="">— keines —</option>
                    {colonies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {loading ? 'Wird gespeichert…' : 'Aufgabe erstellen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete, compact = false }: {
  task: Task
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  compact?: boolean
}) {
  const priority = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.normal
  const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date()

  return (
    <div className={`flex items-start gap-3 px-4 ${compact ? 'py-3' : 'py-3.5'} hover:bg-zinc-50 transition-colors group`}>
      <button onClick={() => onToggle(task.id, task.completed)}
        className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500' : 'border-zinc-300 hover:border-amber-400'}`}>
        {task.completed && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{task.title}</p>
        {!compact && task.description && (
          <p className="text-[12px] text-zinc-400 mt-0.5">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {task.dueDate && (
            <span className={`text-[11px] font-medium ${isOverdue ? 'text-rose-500' : 'text-zinc-400'}`}>
              {new Date(task.dueDate + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {task.colony && <span className="text-[11px] text-zinc-400 truncate">{task.colony.name}</span>}
          {task.apiary && !task.colony && <span className="text-[11px] text-zinc-400 truncate">{task.apiary.name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
        <button onClick={() => onDelete(task.id)} className="p-1 rounded text-zinc-300 hover:text-rose-500 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
