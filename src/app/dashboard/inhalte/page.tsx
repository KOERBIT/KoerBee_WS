'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const CMS_KEYS = [
  { key: 'hero.title', label: 'Hero Überschrift', multiline: false, placeholder: 'Frisch vom Stock.' },
  { key: 'hero.text', label: 'Hero Text', multiline: true, placeholder: 'Honig, Wachs & mehr...' },
  { key: 'hero.cta', label: 'Hero Button-Text', multiline: false, placeholder: 'Produkte entdecken' },
  { key: 'about.label', label: 'Über mich — Label', multiline: false, placeholder: 'Hallo, ich bin der Imker.' },
  { key: 'about.title', label: 'Über mich — Überschrift', multiline: false, placeholder: 'Leidenschaft für Bienen & Natur' },
  { key: 'about.text1', label: 'Über mich — Absatz 1', multiline: true, placeholder: 'Was als Hobby begann...' },
  { key: 'about.text2', label: 'Über mich — Absatz 2', multiline: true, placeholder: 'Mir ist wichtig...' },
  { key: 'products.label', label: 'Produkte — Label', multiline: false, placeholder: 'Aus dem Stock' },
  { key: 'products.title', label: 'Produkte — Überschrift', multiline: false, placeholder: 'Unsere Produkte' },
]

type Locale = 'de' | 'en'

export default function InhaltePage() {
  const [locale, setLocale] = useState<Locale>('de')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadContent = useCallback(async (loc: Locale) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cms/content?locale=${loc}`)
      if (res.ok) {
        const data: Record<string, string> = await res.json()
        setValues(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContent(locale)
  }, [locale, loadContent])

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        CMS_KEYS.map(({ key }) =>
          fetch('/api/cms/content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: values[key] ?? '', locale }),
          })
        )
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full border border-zinc-200 rounded-xl px-4 py-3 text-[14px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400'

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Landingpage-Inhalte</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Bearbeite die Texte der Startseite für jede Sprache.
        </p>
      </div>

      {/* Locale Tabs */}
      <div className="flex gap-2 mb-8">
        {(['de', 'en'] as Locale[]).map(loc => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`px-5 py-2 rounded-xl text-[14px] font-semibold transition-colors ${
              locale === loc
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {loc === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}
          </button>
        ))}
      </div>

      {/* Fields */}
      {loading ? (
        <div className="text-zinc-400 text-sm py-12 text-center">Lade Inhalte…</div>
      ) : (
        <div className="flex flex-col gap-4">
          {CMS_KEYS.map(({ key, label, multiline, placeholder }) => (
            <div key={key} className="bg-white rounded-2xl p-5 shadow-sm">
              <label className="block text-[13px] font-semibold text-zinc-700 mb-2">
                {label}
              </label>
              {multiline ? (
                <textarea
                  rows={4}
                  className={inputClass}
                  placeholder={placeholder}
                  value={values[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className={inputClass}
                  placeholder={placeholder}
                  value={values[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                />
              )}
              <p className="text-[11px] text-zinc-400 mt-1.5 font-mono">{key}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-[14px] rounded-xl transition-colors"
        >
          {saving ? 'Wird gespeichert…' : 'Speichern'}
        </button>

        <Link
          href="/"
          target="_blank"
          className="text-[14px] text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          Vorschau →
        </Link>

        {saved && (
          <span className="text-[14px] text-emerald-600 font-medium">Gespeichert!</span>
        )}
      </div>
    </div>
  )
}
