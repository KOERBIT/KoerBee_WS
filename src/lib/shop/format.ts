import type { Locale } from './i18n'

const NUMBER_LOCALE: Record<Locale, string> = { de: 'de-DE', en: 'en-GB' }

const UNIT_EN: Record<string, string> = { 'Stück': 'piece', 'Glas': 'jar', 'Gläser': 'jars', 'Packung': 'pack' }

/** 12,50 € (de) bzw. €12.50 (en) */
export function formatEur(amount: number, locale: Locale): string {
  return amount.toLocaleString(NUMBER_LOCALE[locale], { style: 'currency', currency: 'EUR' })
}

export function formatDate(date: string | Date, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString(NUMBER_LOCALE[locale], options)
}

/** Verkaufseinheit aus der DB (deutsch gepflegt) für die Anzeige übersetzen. */
export function unitLabel(unit: string, locale: Locale): string {
  return locale === 'en' ? UNIT_EN[unit] ?? unit : unit
}
