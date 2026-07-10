// Typen für das Tracht-Prognose-System (live berechnet aus Open-Meteo + Blühkalender)

export interface Range {
  min: number
  opt: number
  max: number
}

export interface Plant {
  id: string
  name: string
  /** Optimaltemperatur in °C */
  temp: Range
  /** Optimale relative Luftfeuchte in % */
  humidity: Range
  /** Begünstigt Regen die Nektar-/Honigtausekretion? */
  rainBeneficial: boolean
  /** Maximale Windgeschwindigkeit (km/h), ab der Flug/Sekretion stark leidet */
  maxWind: number
  /** Erwartete Nektarmenge in Hochblüte */
  nectar: 'sehr hoch' | 'hoch' | 'mittel' | 'gering'
  /** Erwartete Pollenmenge in Hochblüte */
  pollen: 'sehr hoch' | 'hoch' | 'mittel' | 'gering'
  /** Blühbeginn als [Monat (1-12), Tag] */
  bloomStart: [number, number]
  /** Blühende als [Monat (1-12), Tag] */
  bloomEnd: [number, number]
  /** iNaturalist-Taxonname zur Verifizierung (wissenschaftlich) */
  taxon?: string
  description: string
}

/** Ein normalisierter Wetter-Tag (aus Open-Meteo aggregiert) */
export interface WeatherDay {
  date: string // YYYY-MM-DD
  tempMean: number
  tempMax: number
  tempMin: number
  humidity: number // %
  clouds: number // %
  precipitation: number // mm
  wind: number // km/h
  weathercode: number
  /** Sonnenscheinanteil 0..1 (sunshine/daylight) */
  sunFraction: number
}

export type Rating =
  | '⭐⭐⭐ Hervorragend'
  | '⭐⭐ Sehr gut'
  | '⭐ Gut'
  | 'Befriedigend'
  | 'Schwach'

export interface DayForecast {
  date: string
  dayOfWeek: string
  temperature: number
  humidity: number
  clouds: number
  precipitation: number
  wind: number
  weather: string
  nectarIndex: number
  rating: Rating
  reason: string
}

export interface CurrentBloomPlant {
  plantId: string
  plantName: string
  bloomPhase: string
  bloomStartDate: string
  estimatedEndDate: string
  bloomDaysLeft: number
  nectarAmountExpected: Plant['nectar']
  pollenAmountExpected: Plant['pollen']
  nectarIndexToday: number
  nectarRatingToday: Rating
  explanation: string
  recommendation: string
  forecast7days: DayForecast[]
  bestDaysAhead: string[]
  bestDaysExplanation: string
  verified: boolean
  /** true, wenn Beginn/Ende aus einer eigenen Imker-Meldung stammt (überschreibt das Modell) */
  viaRecord: boolean
  warning: string | null
}

export interface NextBloomPlant {
  plantId: string
  plantName: string
  estimatedStartDate: string
  daysUntilStart: number
  estimatedEndDate: string
  expectedNectarLevel: Plant['nectar']
  description: string
}

export interface LocationForecast {
  locationId: string
  name: string
  region: string
  coordinates: { lat: number; lon: number }
  flightRadius: number | null
  elevation: number | null
  currentStatus: {
    date: string
    temperature: number
    humidity: number
    weather: string
    wind: number
    clouds: number
    precipitation: number
  } | null
  currentBloom: CurrentBloomPlant[]
  nextBloom: NextBloomPlant[]
  seasonalSummary: {
    currentSeason: string
    nextSeason: string
  }
  phenology: {
    /** Grünlandtemperatursumme in °C (null wenn keine Historie verfügbar) */
    gts: number | null
    /** Datum des Vegetationsbeginns (GTS ≥ 200 °C) */
    vegetationStart: string | null
    /** Angewendete phänologische Verschiebung der Blühzeiten in Tagen */
    bloomShiftDays: number
    /** Kumulierter GTS-Verlauf (für die Grafik) */
    gtsSeries: { date: string; gts: number }[]
  }
  recommendations: {
    general: string
    shortTerm: string
    actionItems: string[]
  }
  dataQuality: {
    weatherDataSource: string
    bloomReportsUsed: number
    inaturalistVerified: number
    confidence: number
    confidenceExplanation: string
  }
  warning: string | null
}

export interface ForecastResult {
  generatedAt: string
  forecastPeriod: { start: string; end: string }
  locations: LocationForecast[]
  globalRecommendations: {
    weatherAlert: string | null
  }
}
