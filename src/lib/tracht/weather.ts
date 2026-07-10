import { WeatherDay } from './types'

export interface CurrentWeather {
  temperature: number
  humidity: number
  clouds: number
  wind: number
  precipitation: number
  weathercode: number
}

export interface WeatherResult {
  source: 'Open-Meteo' | 'OpenWeatherMap' | 'OpenWeatherMap (Fallback)'
  elevation: number | null
  days: WeatherDay[]
  /** Live-Messung „jetzt" (für die Anzeige des aktuellen Wetters) */
  current: CurrentWeather | null
}

const FORECAST_DAYS = 7

function meanOfDaytimeHours(
  times: string[],
  values: number[],
  date: string,
): number | null {
  let sum = 0
  let n = 0
  for (let i = 0; i < times.length; i++) {
    if (!times[i].startsWith(date)) continue
    const hour = Number(times[i].slice(11, 13))
    if (hour < 9 || hour > 18) continue // Flugzeit der Bienen
    const v = values[i]
    if (typeof v === 'number' && !Number.isNaN(v)) {
      sum += v
      n++
    }
  }
  return n > 0 ? sum / n : null
}

// ── Open-Meteo (primär, kostenlos, ohne API-Key) ──────────────────
async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherResult | null> {
  const daily = [
    'temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean',
    'precipitation_sum', 'windspeed_10m_max', 'weathercode',
    'sunshine_duration', 'daylight_duration',
  ].join(',')
  const hourly = ['relative_humidity_2m', 'cloudcover'].join(',')
  const currentParams = ['temperature_2m', 'relative_humidity_2m', 'weathercode', 'cloudcover', 'windspeed_10m', 'precipitation'].join(',')
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=${currentParams}&daily=${daily}&hourly=${hourly}&forecast_days=${FORECAST_DAYS}&timezone=auto`

  // Kein Cache: bei jedem Seitenaufruf das aktuelle Wetter liefern.
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  const d = data?.daily
  if (!d?.time?.length) return null

  const days: WeatherDay[] = d.time.map((date: string, i: number) => {
    const humidity = meanOfDaytimeHours(data.hourly?.time ?? [], data.hourly?.relative_humidity_2m ?? [], date)
    const clouds = meanOfDaytimeHours(data.hourly?.time ?? [], data.hourly?.cloudcover ?? [], date)
    const daylight = d.daylight_duration?.[i] ?? 0
    const sunshine = d.sunshine_duration?.[i] ?? 0
    return {
      date,
      tempMean: d.temperature_2m_mean?.[i] ?? (d.temperature_2m_max[i] + d.temperature_2m_min[i]) / 2,
      tempMax: d.temperature_2m_max[i],
      tempMin: d.temperature_2m_min[i],
      humidity: humidity ?? 65,
      clouds: clouds ?? 50,
      precipitation: d.precipitation_sum?.[i] ?? 0,
      wind: d.windspeed_10m_max?.[i] ?? 0,
      weathercode: d.weathercode?.[i] ?? 0,
      sunFraction: daylight > 0 ? Math.min(1, sunshine / daylight) : 0,
    }
  })

  // Unvollständig (z.B. keine Luftfeuchte) → Signal an Aufrufer für Fallback
  const humidityMissing = !data.hourly?.relative_humidity_2m?.length
  if (humidityMissing && process.env.OPENWEATHER_API_KEY) return null

  const c = data.current
  const current: CurrentWeather | null = c ? {
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m ?? 65,
    clouds: c.cloudcover ?? 50,
    wind: c.windspeed_10m ?? 0,
    precipitation: c.precipitation ?? 0,
    weathercode: c.weathercode ?? 0,
  } : null

  return { source: 'Open-Meteo', elevation: data.elevation ?? null, days, current }
}

// ── OpenWeatherMap One Call 3.0 (Fallback, benötigt API-Key) ──────
function owmToWmo(id: number): number {
  if (id >= 200 && id < 300) return 95
  if (id >= 300 && id < 400) return 51
  if (id >= 500 && id < 520) return id <= 501 ? 61 : id === 504 ? 65 : 63
  if (id >= 520 && id < 600) return 80
  if (id >= 600 && id < 700) return id <= 601 ? 71 : 75
  if (id >= 700 && id < 800) return 45
  if (id === 800) return 0
  if (id === 801) return 1
  if (id === 802) return 2
  return 3
}

async function fetchOpenWeatherMap(lat: number, lng: number): Promise<WeatherResult | null> {
  const key = process.env.OPENWEATHER_API_KEY
  if (!key) return null
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}` +
    `&units=metric&exclude=minutely,hourly,alerts&appid=${key}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  const daily = data?.daily
  if (!Array.isArray(daily) || daily.length === 0) return null

  const cur = data.current as Record<string, number | Record<string, number>[]> | undefined
  const curWeather = (cur?.weather as Record<string, number>[])?.[0]
  const current: CurrentWeather | null = cur ? {
    temperature: cur.temp as number,
    humidity: (cur.humidity as number) ?? 65,
    clouds: (cur.clouds as number) ?? 50,
    wind: ((cur.wind_speed as number) ?? 0) * 3.6,
    precipitation: 0,
    weathercode: owmToWmo((curWeather?.id as number) ?? 800),
  } : null

  const days: WeatherDay[] = daily.slice(0, FORECAST_DAYS).map((day: Record<string, number | Record<string, number>[] | Record<string, number>>) => {
    const temp = day.temp as Record<string, number>
    const weather = (day.weather as Record<string, number>[])?.[0]
    return {
      date: new Date((day.dt as number) * 1000).toISOString().slice(0, 10),
      tempMean: temp.day,
      tempMax: temp.max,
      tempMin: temp.min,
      humidity: (day.humidity as number) ?? 65,
      clouds: (day.clouds as number) ?? 50,
      precipitation: (day.rain as number) ?? 0,
      wind: ((day.wind_speed as number) ?? 0) * 3.6, // m/s → km/h
      weathercode: owmToWmo((weather?.id as number) ?? 800),
      sunFraction: 0, // → sunFactor nutzt Bewölkung
    }
  })
  return { source: 'OpenWeatherMap', elevation: null, days, current }
}

export interface HistoryDay { date: string; mean: number; max: number; precip: number }

/**
 * Tages-Historie (Mittel/Max/Niederschlag) vom 1. Januar bis heute – für GTS
 * und das hitzegetriebene Trachtende. Nutzt das Open-Meteo-Archiv; null bei Fehlern.
 */
export async function fetchYearHistory(lat: number, lng: number): Promise<HistoryDay[] | null> {
  const now = new Date()
  const start = `${now.getUTCFullYear()}-01-01`
  const end = now.toISOString().slice(0, 10)
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${start}&end_date=${end}&daily=temperature_2m_mean,temperature_2m_max,precipitation_sum&timezone=auto`
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const time: string[] = data?.daily?.time ?? []
    const means: (number | null)[] = data?.daily?.temperature_2m_mean ?? []
    const maxes: (number | null)[] = data?.daily?.temperature_2m_max ?? []
    const precs: (number | null)[] = data?.daily?.precipitation_sum ?? []
    if (!time.length) return null
    return time
      .map((date, i) => ({ date, mean: means[i] as number, max: (maxes[i] as number) ?? 0, precip: (precs[i] as number) ?? 0 }))
      .filter(d => d.mean != null && !Number.isNaN(d.mean))
  } catch {
    return null
  }
}

/** Holt die 7-Tage-Vorhersage: Open-Meteo primär, OpenWeatherMap als Fallback. */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherResult | null> {
  try {
    const primary = await fetchOpenMeteo(lat, lng)
    if (primary && primary.days.length > 0) return primary
  } catch {
    // weiter zum Fallback
  }
  try {
    const fallback = await fetchOpenWeatherMap(lat, lng)
    if (fallback && fallback.days.length > 0) {
      return { ...fallback, source: 'OpenWeatherMap (Fallback)' }
    }
  } catch {
    // kein Wetter verfügbar
  }
  return null
}
