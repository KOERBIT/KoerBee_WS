'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

const BASE_SIZE = 90
const MIN_SCALE = 0.6
const MAX_SCALE = 1.3

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
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export default function BeeMascot3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLElement | null>(null)
  const mode = useRef<Mode>('patrol')
  const pos = useRef({ x: 0, y: 0 })
  const last = useRef({ x: 0, y: 0 })
  const ori = useRef({ yaw: 0, pitch: 0, roll: 0 })
  const scale = useRef(1)
  const targetScale = useRef(1)
  const facing = useRef(0) // azimuth angle in degrees — 0 = front
  const mouse = useRef({ x: 0, y: 0 })
  const flight = useRef<Flight | null>(null)
  const landedUntil = useRef(0)
  const rafId = useRef(0)
  const [ready, setReady] = useState(false)

  // Track mouse position
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

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

  const apply = useCallback((x: number, y: number, vx?: number) => {
    if (!containerRef.current) return
    const o = ori.current
    const s = scale.current

    // Update facing direction based on horizontal velocity
    if (vx !== undefined && Math.abs(vx) > 0.01) {
      // Calculate target azimuth: bee faces its movement direction
      // atan2 gives angle from velocity, map to camera orbit azimuth
      const targetFacing = vx > 0 ? -90 : 90
      facing.current += (targetFacing - facing.current) * 0.008
    }

    // Update model-viewer camera orbit to face movement direction
    const viewer = viewerRef.current
    if (viewer && 'cameraOrbit' in viewer) {
      (viewer as HTMLElement & { cameraOrbit: string }).cameraOrbit =
        `${facing.current}deg 75deg 4m`
    }

    const half = (BASE_SIZE * s) / 2
    containerRef.current.style.transform =
      `translate3d(${x - half}px, ${y - half}px, 0) scale(${s}) rotateX(${o.pitch}deg) rotateZ(${o.roll}deg)`
  }, [])

  const steer = useCallback((t: number, vx: number, vy: number, mult: number, capYaw: number, capRoll: number, ambient: boolean) => {
    const o = ori.current
    const m = mouse.current
    const p = pos.current

    // Base steering from velocity
    let targetYaw = clamp(vx * mult, -capYaw, capYaw)
    let targetPitch = clamp(-vy * mult, -capYaw * 0.7, capYaw * 0.7)
    let targetRoll = clamp(vx * mult * 0.4, -capRoll, capRoll)

    if (ambient) {
      // Look toward mouse/viewer — gentle attraction
      const dx = m.x - p.x
      const dy = m.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const lookStrength = clamp(1 - dist / 600, 0, 1) * 0.6

      targetYaw += clamp(dx * 0.04, -20, 20) * lookStrength
      targetPitch += clamp(-dy * 0.03, -15, 15) * lookStrength

      // Ambient oscillation (slow, dreamy flight)
      targetYaw += Math.sin(t * 0.0005) * 8
      targetPitch += Math.sin(t * 0.0007 + 1) * 6
      targetRoll += Math.sin(t * 0.00035) * 15 + Math.sin(t * 0.0008 + 2.5) * 8
    }

    o.yaw += (targetYaw - o.yaw) * 0.05
    o.pitch += (targetPitch - o.pitch) * 0.05
    o.roll += (targetRoll - o.roll) * 0.05
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

    // Patrol path: figure-8 with depth (scale) variation
    // The bee flies a lazy loop, scaling up when "approaching" and down when "receding"
    function tick(t: number) {
      if (mode.current === 'patrol') {
        const d = getContainerCenter()

        // Figure-8 path with varying speed
        const phase = t * 0.00012
        const x = d.cx + d.ax * Math.sin(phase)
        const y = d.cy + d.ay * Math.sin(phase * 1.7 + 1.1)

        // Depth simulation: bee "approaches" and "recedes"
        // Use a slow sine to create approach/recede cycles
        const depthPhase = Math.sin(t * 0.00008)  // slow cycle
        const depthTarget = lerp(MIN_SCALE, MAX_SCALE, (depthPhase + 1) / 2)
        targetScale.current = depthTarget

        // Velocity for steering
        const dt = 16
        const nx = d.cx + d.ax * Math.sin((t + dt) * 0.00012)
        const ny = d.cy + d.ay * Math.sin(((t + dt) * 0.00012) * 1.7 + 1.1)
        const vx = nx - x
        steer(t, vx, ny - y, 3.2, 26, 18, true)

        // Smooth scale interpolation
        scale.current += (targetScale.current - scale.current) * 0.03

        pos.current = { x, y }
        last.current = { x, y }
        apply(x, y, vx)
      } else if (mode.current === 'flying' && flight.current) {
        const f = flight.current
        const p = Math.min(1, (t - f.start) / f.dur)
        const e = ease(p)
        const cxArc = (f.from.x + f.to.x) / 2
        const cyArc = Math.min(f.from.y, f.to.y) - f.arc
        const x = (1 - e) * (1 - e) * f.from.x + 2 * (1 - e) * e * cxArc + e * e * f.to.x
        const y = (1 - e) * (1 - e) * f.from.y + 2 * (1 - e) * e * cyArc + e * e * f.to.y

        // Shrink when flying to cart, grow when returning
        targetScale.current = f.onDone ? lerp(scale.current, 0.5, 0.05) : lerp(scale.current, 1.0, 0.05)
        scale.current += (targetScale.current - scale.current) * 0.08

        const fvx = x - last.current.x
        steer(t, fvx, y - last.current.y, 2.4, 34, 16, false)
        pos.current = { x, y }
        last.current = { x, y }
        apply(x, y, fvx)
        if (p >= 1) {
          if (f.onDone) f.onDone()
          flight.current = null
        }
      } else if (mode.current === 'landed') {
        const c = getCartCenter()
        const bob = Math.sin(t * 0.006) * 2
        targetScale.current = 0.5
        scale.current += (targetScale.current - scale.current) * 0.05
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
          width: BASE_SIZE,
          height: BASE_SIZE,
          willChange: 'transform',
          filter: 'drop-shadow(0 10px 12px rgba(20,14,4,.28))',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.5s ease',
          transformOrigin: 'center center',
        }}
      >
        {ready && (
          // @ts-expect-error model-viewer is a web component
          <model-viewer
            ref={viewerRef}
            src="/bee-mascot-queen.glb"
            camera-orbit="0deg 75deg 4m"
            field-of-view="32deg"
            interaction-prompt="none"
            disable-zoom
            disable-pan
            disable-tap
            loading="eager"
            style={{
              width: BASE_SIZE,
              height: BASE_SIZE,
              background: 'transparent',
              '--poster-color': 'transparent',
              '--progress-bar-color': 'transparent',
              '--progress-bar-height': '0',
            } as React.CSSProperties}
          />
        )}
      </div>
    </div>
  )
}
