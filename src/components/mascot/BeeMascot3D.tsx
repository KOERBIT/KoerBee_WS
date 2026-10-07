'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const CONFIG = {
  modell: '/biene.glb',
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
}

const rad = THREE.MathUtils.degToRad
const klemme = THREE.MathUtils.clamp
const winkelDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b))

export default function BeeMascot3D() {
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
      const richtung = ndc
        .unproject(kamera)
        .sub(kamera.position)
        .normalize()
      const t = (tiefe - kamera.position.z) / richtung.z
      return kamera.position.clone().addScaledVector(richtung, t)
    }

    function elementMitte(el: Element): [number, number] {
      const r = el.getBoundingClientRect()
      return [r.left + r.width / 2, r.top + r.height / 2]
    }

    function neuesZiel() {
      const anflug = Math.random() < 0.18
      const tiefe = anflug
        ? THREE.MathUtils.randFloat(3, 5)
        : THREE.MathUtils.randFloat(-9, 1.5)
      const rand = anflug ? 0.35 : 0.85
      return pixelZuWelt(
        innerWidth * (0.5 + THREE.MathUtils.randFloatSpread(rand)),
        innerHeight * (0.5 + THREE.MathUtils.randFloatSpread(rand * 0.9)),
        tiefe,
      )
    }

    // --- Load model ---
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    loader.loadAsync(o.modell).then((gltf) => {
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

      // --- Head tracking (bone "Kopf") ---
      const kopfBone = gltf.scene.getObjectByName('Kopf') as THREE.Bone | undefined
      let kopfRuhe: THREE.Quaternion | null = null
      let kopfP: THREE.Quaternion | null = null
      let kopfGieren = 0
      let kopfNicken = 0
      const _v = new THREE.Vector3()
      const _q = new THREE.Quaternion()
      const _d = new THREE.Quaternion()
      const _e = new THREE.Euler(0, 0, 0, 'YXZ')
      const VORNE = new THREE.Vector3(0, 0, 1)

      if (kopfBone && (kopfBone as THREE.Bone).isBone) {
        gltf.scene.updateMatrixWorld(true)
        kopfRuhe = kopfBone.quaternion.clone()
        kopfP = gltf.scene
          .getWorldQuaternion(new THREE.Quaternion())
          .invert()
          .multiply(
            kopfBone.parent!.getWorldQuaternion(new THREE.Quaternion()),
          )
      }

      function kopfDrehen(dt: number) {
        if (!kopfRuhe || !kopfP || !kopfBone) return
        biene.updateMatrixWorld(true)
        const lokal = kamera.position
          .clone()
          .sub(kopfBone.getWorldPosition(_v))
          .applyQuaternion(
            gltf.scene.getWorldQuaternion(_q).invert(),
          )
        const winkel = THREE.MathUtils.radToDeg(lokal.angleTo(VORNE))
        const blick = klemme(
          (o.kopfGeradeAb - winkel) / (o.kopfGeradeAb - o.kopfBlickBis),
          0,
          1,
        )
        const zielGieren =
          blick *
          klemme(
            Math.atan2(lokal.x, lokal.z),
            -rad(o.kopfMaxGieren),
            rad(o.kopfMaxGieren),
          )
        const zielNicken =
          blick *
          klemme(
            Math.atan2(lokal.y, Math.hypot(lokal.x, lokal.z)),
            -rad(o.kopfMaxNicken),
            rad(o.kopfMaxNicken),
          )
        const k = Math.min(1, dt * 4)
        kopfGieren += (zielGieren - kopfGieren) * k
        kopfNicken += (zielNicken - kopfNicken) * k
        _d.setFromEuler(_e.set(-kopfNicken, kopfGieren, 0, 'YXZ'))
        kopfBone.quaternion
          .copy(kopfP)
          .invert()
          .multiply(_d)
          .multiply(kopfP)
          .multiply(kopfRuhe)
      }

      // --- Maneuver system ---
      type Manoever =
        | { typ: 'erkunden'; ziel: THREE.Vector3 }
        | { typ: 'schweben'; bis: number; zentrum: THREE.Vector3 }
        | { typ: 'achter'; start: number; dauer: number; cx: number; cy: number; rx: number; ry: number; tiefe: number }
        | { typ: 'sturzflug'; kurve: THREE.CatmullRomCurve3; dauer: number; t: number }
        | { typ: 'vorbeiflug'; kurve: THREE.CatmullRomCurve3; dauer: number; t: number }

      function neuesManoever(): Manoever {
        const r = Math.random()

        if (r < 0.25) {
          // Schweben: hover at a spot for 2-4 seconds
          return {
            typ: 'schweben',
            bis: zeit + 2 + Math.random() * 2,
            zentrum: biene.position.clone(),
          }
        }

        if (r < 0.45) {
          // Achter: figure-8 pattern for 6-10 seconds
          const cx = innerWidth * (0.3 + Math.random() * 0.4)
          const cy = innerHeight * (0.2 + Math.random() * 0.4)
          const rx = innerWidth * (0.12 + Math.random() * 0.18)
          const ry = innerHeight * (0.08 + Math.random() * 0.12)
          return {
            typ: 'achter',
            start: zeit,
            dauer: 6 + Math.random() * 4,
            cx, cy, rx, ry,
            tiefe: THREE.MathUtils.randFloat(-4, 2),
          }
        }

        if (r < 0.60) {
          // Sturzflug: swoop down then pull back up
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
          const kurve = new THREE.CatmullRomCurve3(
            [startPos, tiefPunkt, hochPunkt],
            false, 'centripetal',
          )
          return {
            typ: 'sturzflug',
            kurve,
            dauer: klemme(kurve.getLength() / (o.tempo * 1.8), 1.5, 3.5),
            t: 0,
          }
        }

        if (r < 0.75) {
          // Vorbeiflug: fast straight pass across screen
          const vonLinks = Math.random() < 0.5
          const hoehe = innerHeight * (0.15 + Math.random() * 0.5)
          const tiefe = THREE.MathUtils.randFloat(-2, 4)
          const start = pixelZuWelt(vonLinks ? -120 : innerWidth + 120, hoehe, tiefe)
          const mitte = pixelZuWelt(
            innerWidth * 0.5,
            hoehe + THREE.MathUtils.randFloatSpread(innerHeight * 0.2),
            tiefe + THREE.MathUtils.randFloatSpread(3),
          )
          const ende = pixelZuWelt(vonLinks ? innerWidth + 120 : -120, hoehe + THREE.MathUtils.randFloatSpread(100), tiefe)
          // Start the bee near the edge for flyby
          biene.position.copy(start)
          const kurve = new THREE.CatmullRomCurve3(
            [start, mitte, ende],
            false, 'centripetal',
          )
          return {
            typ: 'vorbeiflug',
            kurve,
            dauer: klemme(kurve.getLength() / (o.tempo * 2.2), 2, 4),
            t: 0,
          }
        }

        // Erkunden: fly to a random point (classic behavior)
        return { typ: 'erkunden', ziel: neuesZiel() }
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
      let zeit = 0
      let manoever: Manoever = { typ: 'erkunden', ziel: neuesZiel() }

      function ausrichten(richtung: THREE.Vector3, dt: number) {
        const horiz = Math.hypot(richtung.x, richtung.z)
        const gewicht = horiz / Math.max(richtung.length(), 1e-6)
        const zielGieren = Math.atan2(richtung.x, richtung.z)
        const maxSchritt = rad(o.maxDrehung) * dt * gewicht * gewicht
        const schritt = klemme(
          winkelDiff(zielGieren, gieren),
          -maxSchritt,
          maxSchritt,
        )
        gieren += schritt
        const zielNicken = klemme(
          -Math.atan2(richtung.y, Math.max(horiz, 1e-6)),
          -rad(o.maxNicken),
          rad(o.maxNicken),
        )
        nicken += (zielNicken - nicken) * Math.min(1, dt * 4)
        const zielNeigung = klemme(
          -(schritt / Math.max(dt, 1e-4)) * 0.35,
          -rad(o.maxNeigung),
          rad(o.maxNeigung),
        )
        neigung += (zielNeigung - neigung) * Math.min(1, dt * 4)
        biene.rotation.set(nicken, gieren, neigung)
      }

      function freiFliegen(dt: number) {
        const m = manoever

        if (m.typ === 'erkunden') {
          const zumZiel = m.ziel.clone().sub(biene.position)
          if (zumZiel.length() < 0.8) {
            manoever = neuesManoever()
            return
          }
          const wunsch = zumZiel.normalize().multiplyScalar(o.tempo)
          geschw.lerp(wunsch, Math.min(1, dt * 1.2))
          geschw.setLength(o.tempo)
          biene.position.addScaledVector(geschw, dt)
          ausrichten(geschw, dt)

        } else if (m.typ === 'schweben') {
          // Gentle drift around center point
          const drift = new THREE.Vector3(
            Math.sin(zeit * 1.3) * 0.15,
            Math.sin(zeit * 0.9 + 1) * 0.1,
            Math.sin(zeit * 0.7 + 2) * 0.08,
          )
          const zumZentrum = m.zentrum.clone().add(drift).sub(biene.position)
          geschw.lerp(zumZentrum.multiplyScalar(2), Math.min(1, dt * 3))
          biene.position.addScaledVector(geschw, dt)
          ausrichten(geschw, dt)
          if (zeit > m.bis) manoever = neuesManoever()

        } else if (m.typ === 'achter') {
          const fortschritt = (zeit - m.start) / m.dauer
          if (fortschritt >= 1) {
            manoever = neuesManoever()
            return
          }
          const winkel = fortschritt * Math.PI * 2
          // Lemniscate (figure-8)
          const px = m.cx + m.rx * Math.sin(winkel)
          const py = m.cy + m.ry * Math.sin(winkel * 2)
          const zielPos = pixelZuWelt(px, py, m.tiefe)
          const richtung = zielPos.clone().sub(biene.position)
          geschw.copy(richtung).multiplyScalar(1 / Math.max(dt, 1e-4))
          geschw.clampLength(0, o.tempo * 1.5)
          biene.position.lerp(zielPos, Math.min(1, dt * 5))
          ausrichten(richtung.normalize(), dt)

        } else if (m.typ === 'sturzflug') {
          m.t = Math.min(1, m.t + dt / m.dauer)
          const s = m.t < 0.5 ? 2 * m.t * m.t : 1 - Math.pow(-2 * m.t + 2, 2) / 2
          const neu = m.kurve.getPointAt(s)
          const richtung = neu.clone().sub(biene.position)
          if (richtung.lengthSq() > 1e-8) ausrichten(richtung, dt)
          biene.position.copy(neu)
          if (m.t >= 1) manoever = neuesManoever()

        } else if (m.typ === 'vorbeiflug') {
          m.t = Math.min(1, m.t + dt / m.dauer)
          const s = m.t < 0.3
            ? (m.t / 0.3) * 0.3  // ease in
            : m.t > 0.7
              ? 0.7 + ((m.t - 0.7) / 0.3) * 0.3  // ease out
              : m.t  // constant speed middle
          const neu = m.kurve.getPointAt(klemme(s, 0, 1))
          const richtung = neu.clone().sub(biene.position)
          if (richtung.lengthSq() > 1e-8) ausrichten(richtung, dt)
          biene.position.copy(neu)
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
              pixelZuWelt(
                links ? -100 : innerWidth + 100,
                innerHeight * Math.random() * 0.6,
                -7,
              ),
            )
            geschw.set(links ? o.tempo : -o.tempo, 0, 0)
            gieren = links ? Math.PI / 2 : -Math.PI / 2
            biene.scale.setScalar(1)
            biene.visible = true
            manoever = { typ: 'erkunden', ziel: neuesZiel() }
            modus = 'frei'
          }, 1500)
        }
      }

      // --- Cart flight trigger ---
      function zumWarenkorb() {
        const korb = document.querySelector('#cart-icon')
        if (!korb || modus !== 'frei') return
        const [kx, ky] = elementMitte(korb)
        // Start from current position, arc through center, into cart
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
        const schlag =
          rad(o.fluegelAmplitude) *
          Math.sin(zeit * o.fluegelFrequenz * 2 * Math.PI)
        for (const [f, vorz] of fluegel) if (f) f.rotation.z = vorz * schlag

        // Hover bobbing
        schweben.position.y = 0.05 * Math.sin(zeit * 2 * Math.PI * 1.0)
        schweben.rotation.x = rad(4) * Math.cos(zeit * 2 * Math.PI * 1.0)

        // Head tracking toward viewer
        kopfDrehen(dt)

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
  }, [])

  return <div ref={wrapperRef} />
}
