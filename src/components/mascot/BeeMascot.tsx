'use client'

import { useRef } from 'react'
import { useBeeFlight } from './useBeeFlight'

export default function BeeMascot() {
  const beeRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useBeeFlight(beeRef, innerRef, '#shop-hero', '#cart-icon')

  return (
    <>
      {/* Shared SVG defs */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="sketchy" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={2.2} />
          </filter>
          <radialGradient id="plushGrad" cx="35%" cy="28%" r="78%">
            <stop offset="0%" stopColor="var(--bee-cream)" />
            <stop offset="100%" stopColor="var(--bee-shade)" />
          </radialGradient>
          <radialGradient id="wingGloss" cx="30%" cy="25%" r="80%">
            <stop offset="0%" stopColor="var(--wing-shine)" />
            <stop offset="55%" stopColor="var(--wing-fill)" />
            <stop offset="100%" stopColor="var(--wing-fill)" />
          </radialGradient>
        </defs>
      </svg>

      {/* Bee layer */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60, perspective: 1100 }}>
        <div
          ref={beeRef}
          style={{
            position: 'absolute', top: 0, left: 0, width: 118, height: 118,
            transformStyle: 'preserve-3d', willChange: 'transform',
            filter: 'drop-shadow(0 10px 12px rgba(20,14,4,.28))',
          }}
        >
          <div
            ref={innerRef}
            style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}
          >
            {/* Wing back */}
            <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(-18px)' }}>
              <svg viewBox="-45 -25 290 290" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <path className="bee-wing" style={{ transformBox: 'view-box', transformOrigin: '100px 90px', animationName: 'flapL', animationDuration: '.16s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}
                  d="M90,96 C60,84 18,96 4,122 C-2,144 22,158 54,146 C76,137 87,118 90,96 Z" fill="url(#wingGloss)" stroke="var(--wing-line)" strokeWidth="2" filter="url(#sketchy)" />
                <path className="bee-wing" style={{ transformBox: 'view-box', transformOrigin: '100px 90px', animationName: 'flapR', animationDuration: '.16s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}
                  d="M110,96 C140,84 182,96 196,122 C202,144 178,158 146,146 C124,137 113,118 110,96 Z" fill="url(#wingGloss)" stroke="var(--wing-line)" strokeWidth="2" filter="url(#sketchy)" />
              </svg>
            </div>

            {/* Body */}
            <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(0px)' }}>
              <svg viewBox="-45 -25 290 290" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <g stroke="var(--bee-ink)" strokeWidth="5" strokeLinecap="round" fill="none" filter="url(#sketchy)">
                  <path d="M84,120 C66,128 54,136 46,150" />
                  <path d="M80,138 C60,146 46,156 38,172" />
                  <path d="M116,120 C134,128 146,136 154,150" />
                  <path d="M120,138 C140,146 154,156 162,172" />
                </g>
                <circle cx="46" cy="150" r="4.5" fill="var(--bee-ink)" />
                <circle cx="38" cy="172" r="4.5" fill="var(--bee-ink)" />
                <circle cx="154" cy="150" r="4.5" fill="var(--bee-ink)" />
                <circle cx="162" cy="172" r="4.5" fill="var(--bee-ink)" />
                <path id="abdomen" d="M64,128 C52,172 56,212 100,234 C144,212 148,172 136,128 C122,116 78,116 64,128 Z" fill="url(#plushGrad)" stroke="var(--bee-ink)" strokeWidth="4" filter="url(#sketchy)" />
                <clipPath id="abClip"><use href="#abdomen" /></clipPath>
                <g clipPath="url(#abClip)">
                  <ellipse cx="100" cy="132" rx="34" ry="12" fill="var(--bee-mid)" opacity=".5" />
                  <rect x="40" y="150" width="120" height="17" rx="8" fill="var(--bee-ink)" opacity=".85" />
                  <rect x="40" y="182" width="120" height="18" rx="9" fill="var(--bee-ink)" opacity=".85" />
                  <rect x="45" y="214" width="110" height="18" rx="9" fill="var(--bee-ink)" opacity=".85" />
                </g>
                <ellipse cx="100" cy="104" rx="34" ry="28" fill="url(#plushGrad)" stroke="var(--bee-ink)" strokeWidth="4" filter="url(#sketchy)" />
              </svg>
            </div>

            {/* Wing front */}
            <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(20px)' }}>
              <svg viewBox="-45 -25 290 290" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <path className="bee-wing" style={{ transformBox: 'view-box', transformOrigin: '100px 90px', animationName: 'flapL', animationDuration: '.16s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}
                  d="M96,74 C58,36 -8,42 -22,88 C-28,118 8,136 48,120 C74,110 90,94 96,74 Z" fill="url(#wingGloss)" stroke="var(--wing-line)" strokeWidth="2" filter="url(#sketchy)" />
                <ellipse cx="52" cy="66" rx="20" ry="7" fill="var(--wing-shine)" opacity=".35" transform="rotate(-24 52 66)" />
                <path className="bee-wing" style={{ transformBox: 'view-box', transformOrigin: '100px 90px', animationName: 'flapR', animationDuration: '.16s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}
                  d="M104,74 C142,36 208,42 222,88 C228,118 192,136 152,120 C126,110 110,94 104,74 Z" fill="url(#wingGloss)" stroke="var(--wing-line)" strokeWidth="2" filter="url(#sketchy)" />
                <ellipse cx="148" cy="66" rx="20" ry="7" fill="var(--wing-shine)" opacity=".35" transform="rotate(24 148 66)" />
              </svg>
            </div>

            {/* Head */}
            <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(27px)' }}>
              <svg viewBox="-45 -25 290 290" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <ellipse cx="100" cy="46" rx="35" ry="33" fill="url(#plushGrad)" stroke="var(--bee-ink)" strokeWidth="4" filter="url(#sketchy)" />
              </svg>
            </div>

            {/* Face */}
            <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(35px)' }}>
              <svg viewBox="-45 -25 290 290" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <path className="bee-antenna-l" style={{ transformBox: 'view-box', transformOrigin: '88px 18px', animationName: 'wiggleL', animationDuration: '2.3s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}
                  d="M88,18 C76,4 58,-2 48,-14" stroke="var(--bee-ink)" strokeWidth="4.5" fill="none" strokeLinecap="round" filter="url(#sketchy)" />
                <circle cx="48" cy="-14" r="5.5" fill="var(--bee-ink)" />
                <path className="bee-antenna-r" style={{ transformBox: 'view-box', transformOrigin: '112px 18px', animationName: 'wiggleR', animationDuration: '2.3s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}
                  d="M112,18 C124,4 142,-2 152,-14" stroke="var(--bee-ink)" strokeWidth="4.5" fill="none" strokeLinecap="round" filter="url(#sketchy)" />
                <circle cx="152" cy="-14" r="5.5" fill="var(--bee-ink)" />
                {/* Blush cheeks */}
                <ellipse cx="62" cy="58" rx="9" ry="5.5" fill="var(--shop-blush, #f5a08e)" opacity=".6" />
                <ellipse cx="138" cy="58" rx="9" ry="5.5" fill="var(--shop-blush, #f5a08e)" opacity=".6" />
                {/* Eyes */}
                <ellipse cx="80" cy="44" rx="13" ry="16" fill="var(--bee-ink)" />
                <circle cx="75" cy="37" r="4.2" fill="#fff" opacity=".9" />
                <circle cx="85" cy="50" r="1.8" fill="#fff" opacity=".6" />
                <ellipse cx="120" cy="44" rx="13" ry="16" fill="var(--bee-ink)" />
                <circle cx="125" cy="37" r="4.2" fill="#fff" opacity=".9" />
                <circle cx="115" cy="50" r="1.8" fill="#fff" opacity=".6" />
                {/* Smile */}
                <path d="M90,66 Q100,73 110,66" stroke="var(--bee-ink)" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
