'use client'

import { useTheme, type ThemeId } from './ThemeProvider'

const themes: { id: ThemeId; name: string; desc: string; colors: string[] }[] = [
  {
    id: 'default',
    name: 'Standard',
    desc: 'Helles Design mit Amber-Akzenten',
    colors: ['#f5f5f7', '#ffffff', '#f59e0b', '#18181b'],
  },
  {
    id: 'smoky-honey',
    name: 'Smoky Honey',
    desc: 'Warm & edel — Bernstein, Kupfer, Salbei',
    colors: ['#F5F0EB', '#FFFEFA', '#8B6914', '#B87333'],
  },
  {
    id: 'nordic',
    name: 'Nordic Beekeeper',
    desc: 'Kühl & clean — Petrol, Senf, Lavendel',
    colors: ['#EEF2F6', '#FFFFFF', '#1A535C', '#C5A332'],
  },
  {
    id: 'propolis',
    name: 'Propolis Dark',
    desc: 'Premium Dark Mode — Gold, Terracotta, Jade',
    colors: ['#1C1917', '#2A241C', '#D4A847', '#C07850'],
  },
]

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid grid-cols-2 gap-3">
      {themes.map((t) => {
        const active = theme === t.id
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`relative rounded-2xl p-4 text-left transition-all duration-200 ${
              active
                ? 'ring-2 ring-offset-2 ring-amber-500 scale-[1.02]'
                : 'hover:scale-[1.01]'
            }`}
            style={{
              background: t.colors[1],
              border: `1.5px solid ${active ? t.colors[2] : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            {/* Color swatches */}
            <div className="flex gap-1.5 mb-3">
              {t.colors.map((c, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full border border-black/5"
                  style={{ background: c }}
                />
              ))}
            </div>

            {/* Name */}
            <p
              className="text-[14px] font-semibold"
              style={{ color: t.colors[3] }}
            >
              {t.name}
            </p>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: `${t.colors[3]}99` }}
            >
              {t.desc}
            </p>

            {/* Active indicator */}
            {active && (
              <div
                className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: t.colors[2] }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
