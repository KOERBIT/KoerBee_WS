// Server component — fetches Open-Meteo (free, no API key)
const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Klarer Himmel',       icon: '☀️' },
  1:  { label: 'Überwiegend klar',    icon: '🌤️' },
  2:  { label: 'Teilweise bewölkt',   icon: '⛅' },
  3:  { label: 'Bedeckt',             icon: '☁️' },
  45: { label: 'Nebel',               icon: '🌫️' },
  48: { label: 'Reifnebel',           icon: '🌫️' },
  51: { label: 'Leichter Niesel',     icon: '🌦️' },
  53: { label: 'Nieselregen',         icon: '🌦️' },
  55: { label: 'Starker Niesel',      icon: '🌧️' },
  61: { label: 'Leichter Regen',      icon: '🌧️' },
  63: { label: 'Regen',               icon: '🌧️' },
  65: { label: 'Starker Regen',       icon: '🌧️' },
  71: { label: 'Leichter Schnee',     icon: '❄️' },
  73: { label: 'Schnee',              icon: '❄️' },
  75: { label: 'Starker Schnee',      icon: '❄️' },
  80: { label: 'Leichte Schauer',     icon: '🌦️' },
  81: { label: 'Schauer',             icon: '🌧️' },
  82: { label: 'Starke Schauer',      icon: '⛈️' },
  95: { label: 'Gewitter',            icon: '⛈️' },
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function wmo(code: number) {
  return WMO_CODES[code] ?? { label: 'Unbekannt', icon: '🌡️' }
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
    const res = await fetch(url, { next: { revalidate: 1800 } }) // cache 30 min
    if (res.ok) weather = await res.json()
  } catch {
    // Silently fail — network unavailable
  }

  if (!weather) return null

  const current = weather.current
  const days = weather.daily.time.slice(1, 4) // tomorrow + 2 days

  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-6">
      <p className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Wetter am Bienenstand</p>
      <div className="flex items-stretch gap-4">
        {/* Current */}
        <div className="flex-1 bg-amber-50 rounded-xl px-4 py-3 flex flex-col items-center justify-center text-center">
          <span className="text-3xl mb-1">{wmo(current.weathercode).icon}</span>
          <p className="text-2xl font-semibold text-zinc-900">{Math.round(current.temperature_2m)}°C</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{wmo(current.weathercode).label}</p>
          <p className="text-[11px] font-medium text-amber-600 mt-1">Aktuell</p>
        </div>

        {/* Forecast */}
        <div className="flex gap-2 flex-1">
          {days.map((day, i) => {
            const d = new Date(day)
            const code = weather!.daily.weathercode[i + 1]
            const max = Math.round(weather!.daily.temperature_2m_max[i + 1])
            const min = Math.round(weather!.daily.temperature_2m_min[i + 1])
            return (
              <div key={day} className="flex-1 bg-zinc-50 rounded-xl px-2 py-3 flex flex-col items-center text-center">
                <p className="text-[11px] font-medium text-zinc-500">{WEEKDAYS[d.getDay()]}</p>
                <span className="text-xl my-1">{wmo(code).icon}</span>
                <p className="text-[12px] font-semibold text-zinc-900">{max}°</p>
                <p className="text-[11px] text-zinc-400">{min}°</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
