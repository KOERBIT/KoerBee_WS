// Validierung geografischer Koordinaten (Defense-in-depth gegen kaputte/bösartige Werte).
export function isValidLat(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90
}

export function isValidLng(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180
}

/** Akzeptiert null/undefined (Koordinate optional) oder einen gültigen Wert. */
export function latOk(v: unknown): boolean {
  return v === null || v === undefined || isValidLat(v)
}
export function lngOk(v: unknown): boolean {
  return v === null || v === undefined || isValidLng(v)
}
