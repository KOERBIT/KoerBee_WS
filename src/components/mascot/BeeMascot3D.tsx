'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

const HALF = 59
const BEE_SIZE = 118

type Mode = 'patrol' | 'flying' | 'landed'

interface Flight {
  from: { x: number; y: number }
  to: { x: number; y: number }
  start: number
  dur: number
  arc: number
  onDone?: () => void
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}
function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export default function BeeMascot3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLElement | null>(null)
  const mode = useRef<Mode>('patrol')
  const pos = useRef({ x: 0, y: 0 })
  const last = useRef({ x: 0, y: 0 })
  const ori = useRef({ yaw: 0, pitch: 0, roll: 0 })
  const flight = useRef<Flight | null>(null)
  const landedUntil = useRef(0)
  const rafId = useRef(0)
  const [ready, setReady] = useState(false)

  // Load model-viewer script once
  useEffect(() => {
    if (customElements.get('model-viewer')) {
      setReady(true)
      return
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js'
    script.onload = () => setReady(true)
    document.head.appendChild(script)
  }, [])

  const getContainerCenter = useCallback(() => {
    const el = document.querySelector('#shop-hero')
    if (!el) return { cx: window.innerWidth / 2, cy: 200, ax: 120, ay: 60 }
    const r = el.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height * 0.42, ax: r.width * 0.32, ay: r.height * 0.26 }
  }, [])

  const getCartCenter = useCallback(() => {
    const el = document.querySelector('#cart-icon')
    if (!el) return { x: window.innerWidth - 60, y: 30 }
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, [])

  const apply = useCallback((x: number, y: number) => {
    if (!containerRef.current) return
    const o = ori.current
    containerRef.current.style.transform =
      `translate3d(${x - HALF}px, ${y - HALF}px, 0) rotateY(${o.yaw}deg) rotateX(${o.pitch}deg) rotateZ(${o.roll}deg)`
  }, [])

  const steer = useCallback((t: number, vx: number, vy: number, mult: number, capYaw: number, capRoll: number, ambient: boolean) => {
    const o = ori.current
    let targetYaw = clamp(vx * mult, -capYaw, capYaw)
    let targetPitch = clamp(-vy * mult, -capYaw * 0.7, capYaw * 0.7)
    let targetRoll = clamp(vx * mult * 0.4, -capRoll, capRoll)
    if (ambient) {
      targetYaw += Math.sin(t * 0.0011) * 7
      targetPitch += Math.sin(t * 0.0014 + 1) * 5
    }
    o.yaw += (targetYaw - o.yaw) * 0.12
    o.pitch += (targetPitch - o.pitch) * 0.12
    o.roll += (targetRoll - o.roll) * 0.12
  }, [])

  const flyToCart = useCallback(() => {
    const now = performance.now()
    const target = getCartCenter()
    mode.current = 'flying'
    flight.current = {
      from: { x: pos.current.x, y: pos.current.y },
      to: target,
      start: now,
      dur: 850,
      arc: 110,
      onDone: () => {
        mode.current = 'landed'
        landedUntil.current = performance.now() + 1700
      },
    }
  }, [getCartCenter])

  useEffect(() => {
    if (!ready) return

    const d0 = getContainerCenter()
    pos.current = { x: d0.cx, y: d0.cy }
    last.current = { x: d0.cx, y: d0.cy }
    apply(d0.cx, d0.cy)

    function tick(t: number) {
      if (mode.current === 'patrol') {
        const d = getContainerCenter()
        const x = d.cx + d.ax * Math.sin(t * 0.00065)
        const y = d.cy + d.ay * Math.sin(t * 0.00095 + 1.1)
        const nx = d.cx + d.ax * Math.sin((t + 16) * 0.00065)
        const ny = d.cy + d.ay * Math.sin((t + 16) * 0.00095 + 1.1)
        steer(t, nx - x, ny - y, 3.2, 26, 12, true)
        pos.current = { x, y }
        last.current = { x, y }
        apply(x, y)
      } else if (mode.current === 'flying' && flight.current) {
        const f = flight.current
        const p = Math.min(1, (t - f.start) / f.dur)
        const e = ease(p)
        const cxArc = (f.from.x + f.to.x) / 2
        const cyArc = Math.min(f.from.y, f.to.y) - f.arc
        const x = (1 - e) * (1 - e) * f.from.x + 2 * (1 - e) * e * cxArc + e * e * f.to.x
        const y = (1 - e) * (1 - e) * f.from.y + 2 * (1 - e) * e * cyArc + e * e * f.to.y
        steer(t, x - last.current.x, y - last.current.y, 2.4, 34, 16, false)
        pos.current = { x, y }
        last.current = { x, y }
        apply(x, y)
        if (p >= 1) {
          if (f.onDone) f.onDone()
          flight.current = null
        }
      } else if (mode.current === 'landed') {
        const c = getCartCenter()
        const bob = Math.sin(t * 0.006) * 2
        steer(t, 0, 0, 0, 26, 12, false)
        pos.current = { x: c.x, y: c.y + 18 + bob }
        last.current = { ...pos.current }
        apply(pos.current.x, pos.current.y)
        if (t > landedUntil.current) {
          mode.current = 'flying'
          const d = getContainerCenter()
          flight.current = {
            from: { ...pos.current },
            to: { x: d.cx, y: d.cy },
            start: t,
            dur: 900,
            arc: 70,
            onDone: () => { mode.current = 'patrol' },
          }
        }
      }
      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)

    const handler = () => flyToCart()
    window.addEventListener('korbee:add-to-cart', handler)

    return () => {
      cancelAnimationFrame(rafId.current)
      window.removeEventListener('korbee:add-to-cart', handler)
    }
  }, [ready, apply, steer, flyToCart, getContainerCenter, getCartCenter])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60 }}>
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: BEE_SIZE,
          height: BEE_SIZE,
          willChange: 'transform',
          filter: 'drop-shadow(0 10px 12px rgba(20,14,4,.28))',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        {ready && (
          // @ts-expect-error model-viewer is a web component
          <model-viewer
            ref={viewerRef}
            src="/bee-mascot.glb"
            auto-rotate
            auto-rotate-delay="0"
            rotation-per-second="30deg"
            camera-orbit="0deg 75deg 2.5m"
            field-of-view="45deg"
            interaction-prompt="none"
            disable-zoom
            disable-pan
            disable-tap
            style={{
              width: BEE_SIZE,
              height: BEE_SIZE,
              background: 'transparent',
              '--poster-color': 'transparent',
            } as React.CSSProperties}
          />
        )}
      </div>
    </div>
  )
}
