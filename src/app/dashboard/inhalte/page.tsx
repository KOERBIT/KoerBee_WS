'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

function FormatToolbar({ textareaRef, value, onChange }: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (v: string) => void
}) {
  const wrap = (before: string, after: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + before.length
      ta.selectionEnd = end + before.length
    })
  }

  const prefix = (pfx: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    // Find the beginning of the current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const newVal = value.slice(0, lineStart) + pfx + value.slice(lineStart)
    onChange(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + pfx.length
    })
  }

  const btn = 'px-2 py-1 rounded-lg text-[12px] font-semibold hover:bg-zinc-200 transition-colors text-zinc-600'
  const sep = <div className="w-px h-5 bg-zinc-200 mx-0.5 self-center" />

  return (
    <div className="flex gap-1 mb-1.5 flex-wrap items-center bg-zinc-50 rounded-xl px-2 py-1.5 border border-zinc-200">
      <button type="button" className={btn} onClick={() => prefix('# ')} title="Grosse Überschrift">
        <span style={{ fontSize: '14px' }}>H1</span>
      </button>
      <button type="button" className={btn} onClick={() => prefix('## ')} title="Mittlere Überschrift">
        <span style={{ fontSize: '12px' }}>H2</span>
      </button>
      <button type="button" className={btn} onClick={() => prefix('### ')} title="Kleine Überschrift">
        <span style={{ fontSize: '10px' }}>H3</span>
      </button>
      {sep}
      <button type="button" className={btn} onClick={() => wrap('**', '**')} title="Fett">
        <b>F</b>
      </button>
      <button type="button" className={btn} onClick={() => wrap('*', '*')} title="Kursiv">
        <i>K</i>
      </button>
      <button type="button" className={btn} onClick={() => wrap('~~', '~~')} title="Durchgestrichen">
        <s>D</s>
      </button>
      {sep}
      <button type="button" className={btn} onClick={() => prefix('- ')} title="Aufzählung">
        &bull; Liste
      </button>
      <button type="button" className={btn} onClick={() => prefix('1. ')} title="Nummerierte Liste">
        1. Liste
      </button>
      {sep}
      <button type="button" className={btn} onClick={() => wrap('<small>', '</small>')} title="Kleingedruckt">
        <span style={{ fontSize: '9px' }}>Klein</span>
      </button>
      <button type="button" className={btn} onClick={() => wrap('<big>', '</big>')} title="Grösserer Text">
        <span style={{ fontSize: '14px' }}>Gross</span>
      </button>
      {sep}
      <button type="button" className={btn} onClick={() => wrap('<span class="font-handwriting">', '</span>')} title="Handschrift (Caveat)">
        <span style={{ fontFamily: 'cursive' }}>Handschrift</span>
      </button>
      <button type="button" className={btn} onClick={() => wrap('<span class="font-mono">', '</span>')} title="Monospace">
        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>Mono</span>
      </button>
    </div>
  )
}

function RichTextarea({ value, onChange, placeholder, inputClass }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  inputClass: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  return (
    <div>
      <FormatToolbar textareaRef={ref} value={value} onChange={onChange} />
      <textarea
        ref={ref}
        rows={5}
        className={inputClass + ' resize-y'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

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
                <RichTextarea
                  value={values[key] ?? ''}
                  onChange={v => handleChange(key, v)}
                  placeholder={placeholder}
                  inputClass={inputClass}
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
