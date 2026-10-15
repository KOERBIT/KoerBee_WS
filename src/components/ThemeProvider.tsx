'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type ThemeId = 'default' | 'smoky-honey' | 'nordic' | 'propolis'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'default',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('default')

  useEffect(() => {
    const saved = localStorage.getItem('koerbee-theme') as ThemeId | null
    if (saved && ['default', 'smoky-honey', 'nordic', 'propolis'].includes(saved)) {
      setThemeState(saved)
      if (saved === 'default') {
        document.documentElement.removeAttribute('data-theme')
      } else {
        document.documentElement.setAttribute('data-theme', saved)
      }
    }
  }, [])

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t)
    localStorage.setItem('koerbee-theme', t)
    if (t === 'default') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', t)
    }
  }, [])

  return (
    <ThemeContext value={{ theme, setTheme }}>
      {children}
    </ThemeContext>
  )
}
