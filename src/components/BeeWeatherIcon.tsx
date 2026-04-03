// src/components/BeeWeatherIcon.tsx
// Bienen-SVG-Wettericons nach WMO-Wettercodes (Open-Meteo)

function wmoGroup(code: number): 'sunny' | 'cloudy' | 'foggy' | 'rainy' | 'snowy' | 'stormy' {
  if (code === 0 || code === 1) return 'sunny'
  if (code === 2 || code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'foggy'
  if (code >= 95) return 'stormy'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy'
  if (code >= 51 && code <= 82) return 'rainy'
  return 'cloudy'
}

function SunnyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Sonne */}
      <circle cx="28" cy="28" r="12" fill="#fbbf24" opacity="0.9"/>
      <line x1="28" y1="10" x2="28" y2="15" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="28" y1="41" x2="28" y2="46" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="28" x2="15" y2="28" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="41" y1="28" x2="46" y2="28" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="15" y1="15" x2="19" y2="19" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="37" y1="37" x2="41" y2="41" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="41" y1="15" x2="37" y2="19" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="15" y1="41" x2="19" y2="37" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Biene */}
      <ellipse cx="54" cy="55" rx="11" ry="7.5" fill="#fbbf24" transform="rotate(-20 54 55)"/>
      <ellipse cx="50" cy="48" rx="4" ry="5.5" fill="#1f2937" opacity="0.25" transform="rotate(-20 50 48)"/>
      <ellipse cx="57" cy="51" rx="3" ry="5" fill="#1f2937" opacity="0.2" transform="rotate(-20 57 51)"/>
      <ellipse cx="46" cy="43" rx="9" ry="5" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-30 46 43)"/>
      <ellipse cx="56" cy="42" rx="8" ry="4" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-10 56 42)"/>
      <circle cx="44" cy="57" r="6" fill="#fbbf24"/>
      <circle cx="42" cy="55.5" r="1.4" fill="#1f2937"/>
      <circle cx="46" cy="55.5" r="1.4" fill="#1f2937"/>
      <path d="M42 53 Q39 49 37 47" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M46 53 Q47 49 48 46" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="37" cy="47" r="1.8" fill="#1f2937"/>
      <circle cx="48" cy="46" r="1.8" fill="#1f2937"/>
    </svg>
  )
}

function CloudyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <ellipse cx="42" cy="26" rx="18" ry="12" fill="#d1d5db"/>
      <ellipse cx="28" cy="31" rx="13" ry="10" fill="#d1d5db"/>
      <ellipse cx="52" cy="33" rx="11" ry="9" fill="#e5e7eb"/>
      <ellipse cx="38" cy="38" rx="22" ry="11" fill="#e5e7eb"/>
      <ellipse cx="30" cy="60" rx="11" ry="7" fill="#fbbf24" transform="rotate(-15 30 60)"/>
      <ellipse cx="26" cy="53" rx="8" ry="4.5" fill="#1f2937" opacity="0.22" transform="rotate(-15 26 53)"/>
      <ellipse cx="34" cy="56" rx="7" ry="4" fill="#1f2937" opacity="0.18" transform="rotate(-15 34 56)"/>
      <ellipse cx="22" cy="49" rx="9" ry="5" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-25 22 49)"/>
      <ellipse cx="32" cy="48" rx="8" ry="4" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-5 32 48)"/>
      <circle cx="20" cy="62" r="6" fill="#fbbf24"/>
      <circle cx="18" cy="60.5" r="1.4" fill="#1f2937"/>
      <circle cx="22" cy="60.5" r="1.4" fill="#1f2937"/>
      <path d="M18 58 Q15 54 13 52" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M22 58 Q23 54 24 51" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function RainyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="22" rx="17" ry="11" fill="#9ca3af"/>
      <ellipse cx="26" cy="27" rx="12" ry="9" fill="#9ca3af"/>
      <ellipse cx="50" cy="29" rx="11" ry="8" fill="#6b7280"/>
      <ellipse cx="36" cy="33" rx="20" ry="10" fill="#6b7280"/>
      <line x1="24" y1="46" x2="21" y2="55" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="34" y1="46" x2="31" y2="55" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="44" y1="46" x2="41" y2="55" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="62" cy="55" rx="9" ry="6" fill="#fbbf24" transform="rotate(-20 62 55)"/>
      <ellipse cx="57" cy="47" rx="8" ry="4.5" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-30 57 47)"/>
      <ellipse cx="67" cy="47" rx="7" ry="3.5" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.9" transform="rotate(-5 67 47)"/>
      <circle cx="54" cy="58" r="5" fill="#fbbf24"/>
      <circle cx="52.5" cy="56.5" r="1.2" fill="#1f2937"/>
      <circle cx="55.5" cy="56.5" r="1.2" fill="#1f2937"/>
    </svg>
  )
}

function SnowyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="22" rx="17" ry="11" fill="#bfdbfe"/>
      <ellipse cx="26" cy="27" rx="12" ry="9" fill="#bfdbfe"/>
      <ellipse cx="36" cy="33" rx="20" ry="10" fill="#dbeafe"/>
      <line x1="24" y1="46" x2="24" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="20" y1="50" x2="28" y2="52" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="20" y1="52" x2="28" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="38" y1="48" x2="38" y2="58" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="34" y1="53" x2="42" y2="53" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="60" cy="58" rx="10" ry="6.5" fill="#fbbf24" transform="rotate(-10 60 58)"/>
      <circle cx="50" cy="60" r="5.5" fill="#fbbf24"/>
      <circle cx="49" cy="58.5" r="1.3" fill="#1f2937"/>
      <circle cx="52" cy="58.5" r="1.3" fill="#1f2937"/>
    </svg>
  )
}

function StormyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="20" rx="18" ry="12" fill="#4b5563"/>
      <ellipse cx="26" cy="26" rx="13" ry="10" fill="#374151"/>
      <ellipse cx="36" cy="32" rx="22" ry="11" fill="#374151"/>
      <path d="M42 36 L34 52 L40 52 L32 68" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <ellipse cx="64" cy="52" rx="9" ry="6" fill="#fbbf24" transform="rotate(-25 64 52)"/>
      <ellipse cx="59" cy="44" rx="8" ry="4" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.85" transform="rotate(-35 59 44)"/>
      <circle cx="56" cy="55" r="5" fill="#fbbf24"/>
      <circle cx="54.5" cy="53.5" r="1.2" fill="#1f2937"/>
      <circle cx="57.5" cy="53.5" r="1.2" fill="#1f2937"/>
    </svg>
  )
}

function FoggyBee({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <line x1="12" y1="28" x2="58" y2="28" stroke="#d1d5db" strokeWidth="6" strokeLinecap="round"/>
      <line x1="18" y1="40" x2="64" y2="40" stroke="#d1d5db" strokeWidth="6" strokeLinecap="round"/>
      <line x1="12" y1="52" x2="52" y2="52" stroke="#d1d5db" strokeWidth="6" strokeLinecap="round"/>
      <ellipse cx="62" cy="62" rx="9" ry="6" fill="#fbbf24" opacity="0.7" transform="rotate(-15 62 62)"/>
      <ellipse cx="57" cy="55" rx="7" ry="4" fill="white" stroke="#e5e7eb" strokeWidth="0.8" opacity="0.7" transform="rotate(-25 57 55)"/>
      <circle cx="54" cy="64" r="5" fill="#fbbf24" opacity="0.7"/>
      <circle cx="52.5" cy="62.5" r="1.2" fill="#1f2937" opacity="0.7"/>
      <circle cx="55.5" cy="62.5" r="1.2" fill="#1f2937" opacity="0.7"/>
    </svg>
  )
}

export function BeeWeatherIcon({ code, size = 64 }: { code: number; size?: number }) {
  const group = wmoGroup(code)
  switch (group) {
    case 'sunny':  return <SunnyBee size={size} />
    case 'cloudy': return <CloudyBee size={size} />
    case 'rainy':  return <RainyBee size={size} />
    case 'snowy':  return <SnowyBee size={size} />
    case 'stormy': return <StormyBee size={size} />
    case 'foggy':  return <FoggyBee size={size} />
    default:       return <CloudyBee size={size} />
  }
}
