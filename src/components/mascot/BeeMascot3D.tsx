'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const CONFIG = {
  tempo: 2.4,
  tempoWarenkorb: 6,
  fluegelFrequenz: 12,
  fluegelAmplitude: 35,
  maxNicken: 20,
  maxNeigung: 15,
  maxDrehung: 150,
  kopfMaxGieren: 45,
  kopfMaxNicken: 20,
  kopfBlickBis: 100,
  kopfGeradeAb: 130,
  fuehlerWippen: 8,
  fuehlerFrequenz: 1.7,
}

const rad = THREE.MathUtils.degToRad
const klemme = THREE.MathUtils.clamp
const winkelDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b))

export interface BeeMascot3DProps {
  /** Path to GLB model in /public, e.g. "/biene.glb" */
  modell?: string
}

export default function BeeMascot3D({ modell = '/biene.glb' }: BeeMascot3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (cleanupRef.current) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const o = CONFIG
    let laeuft = true

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    Object.assign(renderer.domElement.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '60',
    })
    document.body.appendChild(renderer.domElement)

    // --- Scene ---
    const szene = new THREE.Scene()
    szene.environment = new THREE.PMREMGenerator(renderer)
      .fromScene(new RoomEnvironment(), 0.04).texture
    szene.environmentIntensity = 0.5
    szene.add(new THREE.HemisphereLight(0xffffff, 0x886633, 0.6))
    const sonne = new THREE.DirectionalLight(0xffffff, 1.6)
    sonne.position.set(3, 6, 5)
    szene.add(sonne)

    const kamera = new THREE.PerspectiveCamera(35, 1, 0.05, 100)
    kamera.position.set(0, 0, 10)

    function groesse() {
      renderer.setSize(innerWidth, innerHeight, false)
      kamera.aspect = innerWidth / innerHeight
      kamera.updateProjectionMatrix()
    }
    groesse()
    addEventListener('resize', groesse)

    // --- Helpers ---
    function pixelZuWelt(px: number, py: number, tiefe: number) {
      const ndc = new THREE.Vector3(
        (px / innerWidth) * 2 - 1,
        -(py / innerHeight) * 2 + 1,
        0.5,
      )
      const richtung = ndc.unproject(kamera).sub(kamera.position).normalize()
      const t = (tiefe - kamera.position.z) / richtung.z
      return kamera.position.clone().addScaledVector(richtung, t)
    }

    function elementMitte(el: Element): [number, number] {
      const r = el.getBoundingClientRect()
      return [r.left + r.width / 2, r.top + r.height / 2]
    }

    function zufallsPunkt(nahAnflug = false) {
      const tiefe = nahAnflug
        ? THREE.MathUtils.randFloat(3, 5)
        : THREE.MathUtils.randFloat(-9, 1.5)
      const rand = nahAnflug ? 0.35 : 0.85
      return pixelZuWelt(
        innerWidth * (0.5 + THREE.MathUtils.randFloatSpread(rand)),
        innerHeight * (0.5 + THREE.MathUtils.randFloatSpread(rand * 0.9)),
        tiefe,
      )
    }

    // --- Load model ---
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    loader.loadAsync(modell).then((gltf) => {
      if (!laeuft) return

      const biene = new THREE.Group()
      const schweben = new THREE.Group()
      biene.add(schweben)
      schweben.add(gltf.scene)
      szene.add(biene)
      biene.rotation.order = 'YXZ'

      const fluegel: [THREE.Object3D | undefined, number][] = [
        [gltf.scene.getObjectByName('Fluegel_L'), -1],
        [gltf.scene.getObjectByName('Fluegel_R'), 1],
      ]
      gltf.scene.traverse((k) => {
        if ((k as THREE.Mesh).isMesh) {
          const mat = (k as THREE.Mesh).material as THREE.MeshStandardMaterial
          if (mat.transparent) mat.depthWrite = false
        }
        if ((k as THREE.SkinnedMesh).isSkinnedMesh) {
          (k as THREE.SkinnedMesh).frustumCulled = false
        }
      })

      // --- Year color marking (Jahresfarbkennzeichen) ---
      // Cycle: 1/6=weiß, 2/7=gelb, 3/8=rot, 4/9=grün, 5/0=blau
      const jahresfarben: Record<number, number> = {
        0: 0x0055ff, // blau (2025, 2030)
        1: 0xffffff, // weiß (2021, 2026)
        2: 0xffdd00, // gelb (2022, 2027)
        3: 0xdd0000, // rot  (2023, 2028)
        4: 0x00aa00, // grün (2024, 2029)
      }
      const jahrFarbe = jahresfarben[new Date().getFullYear() % 5]
      const rumpfBone = gltf.scene.getObjectByName('Rumpf')
      if (rumpfBone) {
        const scheibeGeo = new THREE.CircleGeometry(0.06, 24)
        const scheibeMat = new THREE.MeshStandardMaterial({
          color: jahrFarbe,
          roughness: 0.3,
          metalness: 0.1,
          side: THREE.DoubleSide,
        })
        const scheibe = new THREE.Mesh(scheibeGeo, scheibeMat)
        // Position on thorax top — slightly above center, facing up
        scheibe.position.set(0, 0.42, 0.12)
        scheibe.rotation.x = -Math.PI / 2.3
        rumpfBone.add(scheibe)

        // Load KörBee logo onto the marking disc
        new THREE.TextureLoader().load('/Koerbee_Logo.png', (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          scheibeMat.map = tex
          scheibeMat.needsUpdate = true
        })
      }

      // --- Bone helper (generalized for head, antennae, etc.) ---
      const _d = new THREE.Quaternion()
      const _e = new THREE.Euler(0, 0, 0, 'YXZ')
      const _v = new THREE.Vector3()
      const _q = new THREE.Quaternion()
      const VORNE = new THREE.Vector3(0, 0, 1)
      gltf.scene.updateMatrixWorld(true)

      type BoneHandle = {
        bone: THREE.Bone
        setze: (nicken: number, gieren: number, rollen?: number) => void
      }
      function knochenSetup(name: string): BoneHandle | null {
        const k = gltf.scene.getObjectByName(name)
        if (!k || !(k as THREE.Bone).isBone) return null
        const bone = k as THREE.Bone
        const ruhe = bone.quaternion.clone()
        const P = gltf.scene.getWorldQuaternion(new THREE.Quaternion()).invert()
          .multiply(bone.parent!.getWorldQuaternion(new THREE.Quaternion()))
        const Pi = P.clone().invert()
        return {
          bone,
          setze(nicken: number, gieren: number, rollen = 0) {
            _d.setFromEuler(_e.set(-nicken, gieren, rollen, 'YXZ'))
            bone.quaternion.copy(Pi).multiply(_d).multiply(P).multiply(ruhe)
          },
        }
      }

      const kopfK = knochenSetup('Kopf')
      const fuehlerHandles = [knochenSetup('Fuehler_L'), knochenSetup('Fuehler_R')]
      let kopfGieren = 0
      let kopfNicken = 0

      function fuehlerWippen() {
        fuehlerHandles.forEach((f, i) => {
          if (!f) return
          const w = zeit * o.fuehlerFrequenz * 2 * Math.PI + i * 1.3
          f.setze(
            rad(o.fuehlerWippen) * Math.sin(w),
            rad(o.fuehlerWippen) * 0.5 * Math.sin(w * 0.7 + 0.5),
          )
        })
      }

      function kopfDrehen(dt: number) {
        if (!kopfK) return
        biene.updateMatrixWorld(true)
        const lokal = kamera.position
          .clone()
          .sub(kopfK.bone.getWorldPosition(_v))
          .applyQuaternion(gltf.scene.getWorldQuaternion(_q).invert())
        const winkel = THREE.MathUtils.radToDeg(lokal.angleTo(VORNE))
        const blick = klemme(
          (o.kopfGeradeAb - winkel) / (o.kopfGeradeAb - o.kopfBlickBis), 0, 1,
        )
        const zG = blick * klemme(Math.atan2(lokal.x, lokal.z), -rad(o.kopfMaxGieren), rad(o.kopfMaxGieren))
        const zN = blick * klemme(Math.atan2(lokal.y, Math.hypot(lokal.x, lokal.z)), -rad(o.kopfMaxNicken), rad(o.kopfMaxNicken))
        const k = Math.min(1, dt * 4)
        kopfGieren += (zG - kopfGieren) * k
        kopfNicken += (zN - kopfNicken) * k
        kopfK.setze(kopfNicken, kopfGieren)
      }

      // =====================================================================
      // Maneuver system — each maneuver produces a series of waypoints.
      // The bee always flies with the SAME soft steering, never teleporting.
      // =====================================================================
      type Manoever =
        | { typ: 'erkunden' }
        | { typ: 'schweben'; bis: number; zentrum: THREE.Vector3 }
        | { typ: 'achter'; start: number; dauer: number; cx: number; cy: number; rx: number; ry: number; tiefe: number }
        | { typ: 'kurvenpfad'; kurve: THREE.CatmullRomCurve3; dauer: number; t: number }

      let zeit = 0
      let ziel = zufallsPunkt()

      function neuesManoever(): Manoever {
        const r = Math.random()

        if (r < 0.22) {
          // Schweben: hover at current spot for 2-4 seconds
          return { typ: 'schweben', bis: zeit + 2 + Math.random() * 2, zentrum: biene.position.clone() }
        }

        if (r < 0.42) {
          // Achter: figure-8 for 6-10 seconds
          const cx = innerWidth * (0.3 + Math.random() * 0.4)
          const cy = innerHeight * (0.2 + Math.random() * 0.4)
          return {
            typ: 'achter', start: zeit, dauer: 6 + Math.random() * 4,
            cx, cy,
            rx: innerWidth * (0.12 + Math.random() * 0.18),
            ry: innerHeight * (0.08 + Math.random() * 0.12),
            tiefe: THREE.MathUtils.randFloat(-4, 2),
          }
        }

        if (r < 0.58) {
          // Sturzflug: swoop via curve waypoints
          const startPos = biene.position.clone()
          const tiefPunkt = pixelZuWelt(
            innerWidth * (0.3 + Math.random() * 0.4),
            innerHeight * (0.7 + Math.random() * 0.2),
            THREE.MathUtils.randFloat(2, 5),
          )
          const hochPunkt = pixelZuWelt(
            innerWidth * (0.2 + Math.random() * 0.6),
            innerHeight * (0.1 + Math.random() * 0.2),
            THREE.MathUtils.randFloat(-5, 0),
          )
          const kurve = new THREE.CatmullRomCurve3([startPos, tiefPunkt, hochPunkt], false, 'centripetal')
          return {
            typ: 'kurvenpfad', kurve,
            dauer: klemme(kurve.getLength() / (o.tempo * 1.6), 2, 4), t: 0,
          }
        }

        if (r < 0.72) {
          // Vorbeiflug: sweeping pass
          const vonLinks = Math.random() < 0.5
          const hoehe = innerHeight * (0.15 + Math.random() * 0.5)
          const tiefe = THREE.MathUtils.randFloat(-2, 4)
          const startPos = biene.position.clone()
          const mitte = pixelZuWelt(
            innerWidth * (vonLinks ? 0.6 : 0.4),
            hoehe + THREE.MathUtils.randFloatSpread(innerHeight * 0.15),
            tiefe + THREE.MathUtils.randFloatSpread(2),
          )
          const ende = pixelZuWelt(
            vonLinks ? innerWidth * 0.9 : innerWidth * 0.1,
            hoehe + THREE.MathUtils.randFloatSpread(80),
            tiefe,
          )
          const kurve = new THREE.CatmullRomCurve3([startPos, mitte, ende], false, 'centripetal')
          return {
            typ: 'kurvenpfad', kurve,
            dauer: klemme(kurve.getLength() / (o.tempo * 2), 2.5, 5), t: 0,
          }
        }

        // Erkunden: fly to random point
        ziel = zufallsPunkt(Math.random() < 0.18)
        return { typ: 'erkunden' }
      }

      // --- State ---
      biene.position.copy(pixelZuWelt(-80, innerHeight * 0.3, -6))
      const geschw = new THREE.Vector3(o.tempo, 0, 0)
      let gieren = Math.PI / 2
      let nicken = 0
      let neigung = 0
      let modus: 'frei' | 'warenkorb' | 'pause' = 'frei'
      let korbFlug: {
        kurve: THREE.CatmullRomCurve3
        dauer: number
        t: number
        fertig: () => void
      } | null = null
      let manoever: Manoever = { typ: 'erkunden' }
      let erkundenZaehler = 0

      // Original steering from biene.js — rotation-based, not velocity lerp
      function ausrichten(richtung: THREE.Vector3, dt: number) {
        const horiz = Math.hypot(richtung.x, richtung.z)
        const gewicht = horiz / Math.max(richtung.length(), 1e-6)
        const zielGieren = Math.atan2(richtung.x, richtung.z)
        const maxSchritt = rad(o.maxDrehung) * dt * gewicht * gewicht
        const schritt = klemme(winkelDiff(zielGieren, gieren), -maxSchritt, maxSchritt)
        gieren += schritt
        const zielNicken = klemme(
          -Math.atan2(richtung.y, Math.max(horiz, 1e-6)),
          -rad(o.maxNicken), rad(o.maxNicken),
        )
        nicken += (zielNicken - nicken) * Math.min(1, dt * 4)
        const zielNeigung = klemme(
          -(schritt / Math.max(dt, 1e-4)) * 0.35,
          -rad(o.maxNeigung), rad(o.maxNeigung),
        )
        neigung += (zielNeigung - neigung) * Math.min(1, dt * 4)
        biene.rotation.set(nicken, gieren, neigung)
      }

      // Fly toward target — like original biene.js freiFliegen
      function fliegeZu(zielPos: THREE.Vector3, dt: number, tempo: number) {
        const zumZiel = zielPos.clone().sub(biene.position)
        const wunsch = zumZiel.normalize().multiplyScalar(tempo)
        // Original uses dt * 1.2 lerp — but we also need distance-based
        // aggressiveness: steer harder when close to avoid circling
        const dist = zumZiel.length()
        const aggressiv = dist < 2 ? 4 : 1.2
        geschw.lerp(wunsch, Math.min(1, dt * aggressiv))
        geschw.setLength(tempo)
        biene.position.addScaledVector(geschw, dt)
        ausrichten(geschw, dt)
      }

      function freiFliegen(dt: number) {
        const m = manoever

        if (m.typ === 'erkunden') {
          fliegeZu(ziel, dt, o.tempo)
          const dist = ziel.clone().sub(biene.position).length()
          if (dist < 1.5) {
            erkundenZaehler++
            if (erkundenZaehler >= 2 + Math.floor(Math.random() * 2)) {
              erkundenZaehler = 0
              manoever = neuesManoever()
            } else {
              ziel = zufallsPunkt(Math.random() < 0.18)
            }
          }

        } else if (m.typ === 'schweben') {
          // Gentle drift around center
          const drift = new THREE.Vector3(
            Math.sin(zeit * 1.3) * 0.3,
            Math.sin(zeit * 0.9 + 1) * 0.2,
            Math.sin(zeit * 0.7 + 2) * 0.15,
          )
          const schwebZiel = m.zentrum.clone().add(drift)
          // Slow down and steer gently
          const zumZiel = schwebZiel.clone().sub(biene.position)
          geschw.lerp(zumZiel.multiplyScalar(2), Math.min(1, dt * 3))
          geschw.clampLength(0, o.tempo * 0.4)
          biene.position.addScaledVector(geschw, dt)
          ausrichten(geschw.length() > 0.01 ? geschw : new THREE.Vector3(0, 0, 1), dt)
          if (zeit > m.bis) manoever = neuesManoever()

        } else if (m.typ === 'achter') {
          const fortschritt = (zeit - m.start) / m.dauer
          if (fortschritt >= 1) {
            manoever = neuesManoever()
            return
          }
          const winkel = fortschritt * Math.PI * 2
          const px = m.cx + m.rx * Math.sin(winkel)
          const py = m.cy + m.ry * Math.sin(winkel * 2)
          const achterZiel = pixelZuWelt(px, py, m.tiefe)
          // Steer toward figure-8 point with moderate aggressiveness
          fliegeZu(achterZiel, dt, o.tempo * 1.2)

        } else if (m.typ === 'kurvenpfad') {
          m.t = Math.min(1, m.t + dt / m.dauer)
          const s = m.t < 0.5 ? 2 * m.t * m.t : 1 - Math.pow(-2 * m.t + 2, 2) / 2
          const kurvenZiel = m.kurve.getPointAt(s)
          // Faster tempo for curve maneuvers, steer toward moving target
          fliegeZu(kurvenZiel, dt, o.tempo * 1.6)
          if (m.t >= 1) manoever = neuesManoever()
        }
      }

      function warenkorbFliegen(dt: number) {
        if (!korbFlug) return
        const f = korbFlug
        f.t = Math.min(1, f.t + dt / f.dauer)
        const s = f.t < 0.5 ? 2 * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 2) / 2
        const neu = f.kurve.getPointAt(s)
        const richtung = neu.clone().sub(biene.position)
        if (richtung.lengthSq() > 1e-8) ausrichten(richtung, dt)
        biene.position.copy(neu)
        biene.scale.setScalar(
          s < 0.75 ? 1 : Math.max(0.001, 1 - (s - 0.75) / 0.25),
        )
        if (f.t >= 1) {
          biene.visible = false
          modus = 'pause'
          f.fertig()
          setTimeout(() => {
            const links = Math.random() < 0.5
            biene.position.copy(
              pixelZuWelt(links ? -100 : innerWidth + 100, innerHeight * Math.random() * 0.6, -7),
            )
            geschw.set(links ? o.tempo : -o.tempo, 0, 0)
            gieren = links ? Math.PI / 2 : -Math.PI / 2
            biene.scale.setScalar(1)
            biene.visible = true
            erkundenZaehler = 0
            manoever = { typ: 'erkunden' }
            ziel = zufallsPunkt()
            modus = 'frei'
          }, 1500)
        }
      }

      // --- Cart flight trigger ---
      function zumWarenkorb() {
        const korb = document.querySelector('#cart-icon')
        if (!korb || modus !== 'frei') return
        const [kx, ky] = elementMitte(korb)
        const punkte = [
          biene.position.clone(),
          pixelZuWelt(innerWidth / 2, innerHeight * 0.3, 2.5),
          pixelZuWelt((innerWidth / 2 + kx) / 2, Math.min(innerHeight * 0.3, ky) - 80, 3.5),
          pixelZuWelt(kx, ky, 5.5),
        ]
        const kurve = new THREE.CatmullRomCurve3(punkte, false, 'centripetal')
        const dauer = klemme(kurve.getLength() / o.tempoWarenkorb, 1.4, 3.2)
        korbFlug = { kurve, dauer, t: 0, fertig: () => {} }
        modus = 'warenkorb'
      }

      const onAddToCart = () => zumWarenkorb()
      window.addEventListener('korbee:add-to-cart', onAddToCart)

      // --- Animation loop ---
      const uhr = new THREE.Clock()
      renderer.setAnimationLoop(() => {
        if (!laeuft) return
        const dt = Math.min(uhr.getDelta(), 0.05)
        zeit += dt

        if (modus === 'frei') freiFliegen(dt)
        else if (modus === 'warenkorb') warenkorbFliegen(dt)

        // Wing flapping
        const schlag = rad(o.fluegelAmplitude) * Math.sin(zeit * o.fluegelFrequenz * 2 * Math.PI)
        for (const [f, vorz] of fluegel) if (f) f.rotation.z = vorz * schlag

        // Hover bobbing
        schweben.position.y = 0.05 * Math.sin(zeit * 2 * Math.PI * 1.0)
        schweben.rotation.x = rad(4) * Math.cos(zeit * 2 * Math.PI * 1.0)

        // Head tracking + antennae
        kopfDrehen(dt)
        fuehlerWippen()

        renderer.render(szene, kamera)
      })

      // Extend cleanup
      cleanupRef.current = () => {
        laeuft = false
        renderer.setAnimationLoop(null)
        renderer.domElement.remove()
        renderer.dispose()
        removeEventListener('resize', groesse)
        window.removeEventListener('korbee:add-to-cart', onAddToCart)
      }
    })

    // Initial cleanup (before model loads)
    cleanupRef.current = () => {
      laeuft = false
      renderer.setAnimationLoop(null)
      renderer.domElement.remove()
      renderer.dispose()
      removeEventListener('resize', groesse)
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [modell])

  return <div ref={wrapperRef} />
}
