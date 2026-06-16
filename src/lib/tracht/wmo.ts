// WMO-Wettercodes → deutsche Kurzbeschreibung
const WMO_LABELS: Record<number, string> = {
  0: 'Klarer Himmel', 1: 'Überwiegend klar', 2: 'Teilweise bewölkt', 3: 'Bedeckt',
  45: 'Nebel', 48: 'Reifnebel',
  51: 'Leichter Niesel', 53: 'Nieselregen', 55: 'Starker Niesel',
  61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
  71: 'Leichter Schnee', 73: 'Schnee', 75: 'Starker Schnee',
  80: 'Leichte Schauer', 81: 'Schauer', 82: 'Starke Schauer',
  95: 'Gewitter',
}

export function wmoLabel(code: number): string {
  return WMO_LABELS[code] ?? 'Wechselhaft'
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

export function weekday(dateIso: string): string {
  return WEEKDAYS[new Date(dateIso + 'T12:00:00Z').getUTCDay()]
}
