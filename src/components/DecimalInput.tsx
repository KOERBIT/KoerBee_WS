'use client'

import { useState, useEffect } from 'react'

// Akzeptiert Punkt UND Komma als Dezimaltrennzeichen und liefert eine Zahl.
export function parseDecimal(s: string): number {
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export function numToText(v: number): string {
  return !Number.isFinite(v) || v === 0 ? '' : String(v).replace('.', ',')
}

// Zahlen-Eingabefeld, das sowohl "6,50" als auch "6.50" versteht. Hält beim
// Tippen den Rohtext, damit Zwischenstände wie "6," nicht zurückspringen.
export function DecimalInput({
  value, onChange, className, placeholder, min = 0,
}: {
  value: number
  onChange: (n: number) => void
  className?: string
  placeholder?: string
  min?: number
}) {
  const [text, setText] = useState(() => numToText(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused && parseDecimal(text || '0') !== value) setText(numToText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      className={className}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setText(numToText(value)) }}
      onChange={e => {
        const raw = e.target.value
        if (/[^0-9.,\s]/.test(raw)) return
        setText(raw)
        const trimmed = raw.trim()
        if (trimmed === '' || trimmed === ',' || trimmed === '.') { onChange(min); return }
        const n = parseDecimal(trimmed)
        if (Number.isFinite(n)) onChange(n)
      }}
    />
  )
}
