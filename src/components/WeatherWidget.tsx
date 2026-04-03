// Server component — fetches Open-Meteo (free, no API key)
import { BeeWeatherIcon } from '@/components/BeeWeatherIcon'

const WMO_LABELS: Record<number, string> = {
  0:  'Klarer Himmel',     1: 'Überwiegend klar',  2: 'Teilweise bewölkt',
  3:  'Bedeckt',           45: 'Nebel',             48: 'Reifnebel',
  51: 'Leichter Niesel',   53: 'Nieselregen',       55: 'Starker Niesel',
  61: 'Leichter Regen',    63: 'Regen',             65: 'Starker Regen',
  71: 'Leichter Schnee',   73: 'Schnee',            75: 'Starker Schnee',
  80: 'Leichte Schauer',   81: 'Schauer',           82: 'Starke Schauer',
  95: 'Gewitter',
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function wmoLabel(code: number) {
  return WMO_LABELS[code] ?? 'Unbekannt'
}

interface WeatherData {
  current: { temperature_2m: number; weathercode: number }
  daily: {
    time: string[]
    weathercode: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export async function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  let weather: WeatherData | null = null
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto`
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (res.ok) weather = await res.json()
  } catch {
    // Silently fail — network unavailable
  }

  if (!weather) return null

  const current = weather.current
  const days = weather.daily.time.slice(1, 4)

  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-6">
      <p className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Wetter am Bienenstand</p>
      <div className="flex items-stretch gap-4">
        {/* Aktuell */}
        <div className="flex-1 bg-amber-50 rounded-xl px-4 py-3 flex flex-col items-center justify-center text-center">
          <BeeWeatherIcon code={current.weathercode} size={64} />
          <p className="text-2xl font-semibold text-zinc-900 mt-1">{Math.round(current.temperature_2m)}°C</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{wmoLabel(current.weathercode)}</p>
          <p className="text-[11px] font-medium text-amber-600 mt-1">Aktuell</p>
        </div>

        {/* Vorschau 3 Tage */}
        <div className="flex gap-2 flex-1">
          {days.map((day, i) => {
            const d = new Date(day)
            const code = weather!.daily.weathercode[i + 1]
            const max = Math.round(weather!.daily.temperature_2m_max[i + 1])
            const min = Math.round(weather!.daily.temperature_2m_min[i + 1])
            return (
              <div key={day} className="flex-1 bg-zinc-50 rounded-xl px-2 py-3 flex flex-col items-center text-center">
                <p className="text-[11px] font-medium text-zinc-500">{WEEKDAYS[d.getDay()]}</p>
                <BeeWeatherIcon code={code} size={36} />
                <p className="text-[12px] font-semibold text-zinc-900 mt-1">{max}°</p>
                <p className="text-[11px] text-zinc-400">{min}°</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
