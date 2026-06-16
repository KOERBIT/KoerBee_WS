import { WeatherDay } from './types'

export interface WeatherResult {
  source: 'Open-Meteo' | 'OpenWeatherMap' | 'OpenWeatherMap (Fallback)'
  elevation: number | null
  days: WeatherDay[]
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=${daily}&hourly=${hourly}&forecast_days=${FORECAST_DAYS}&timezone=auto`

  const res = await fetch(url, { next: { revalidate: 3600 } })
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

  return { source: 'Open-Meteo', elevation: data.elevation ?? null, days }
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
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  const daily = data?.daily
  if (!Array.isArray(daily) || daily.length === 0) return null

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
  return { source: 'OpenWeatherMap', elevation: null, days }
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
