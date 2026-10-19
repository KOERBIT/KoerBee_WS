'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/**
 * Zwei 3D-Insekten fliegen gemeinsam ueber die Webseite.
 * Das erste fuehrt (zufaellige Bahnen), das zweite begleitet es seitlich
 * versetzt und wechselt gelegentlich die Seite.
 *
 * Basiert auf bienen.js aus den Duo-Ordnern (Insekten_Duo_Web).
 */

const CONFIG = {
  tempo: 2.4,
  tempoWarenkorb: 6,
  fluegelFrequenz: 12,
  fluegelAmplitude: 35,
  maxNicken: 20,
  maxNeigung: 15,
  maxDrehung: 150,
  kopfMaxGieren: 15,
  kopfMaxNicken: 8,
  fuehlerWippen: 8,
  fuehlerFrequenz: 1.7,
  blinzelnAlle: [2.5, 6] as [number, number],
  mundSpiel: 0.06,
  mundLachen: 0.12,
  kopfBlickBis: 100,
  kopfGeradeAb: 130,
  begleitAbstand: 1.6,
}

const rad = THREE.MathUtils.degToRad
const klemme = THREE.MathUtils.clamp
const winkelDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

export interface BeeDuo3DProps {
  modelle: [string, string]
}

interface Insekt {
  biene: THREE.Group
  schweben: THREE.Group
  scene: THREE.Group
  geschw: THREE.Vector3
  ziel: THREE.Vector3
  gieren: number
  nicken: number
  neigung: number
  kopfGieren: number
  kopfNicken: number
  phase: number
  seite: number
  fluegel: [THREE.Object3D | undefined, number][]
  kopfK: BoneHandle | null
  fuehler: (BoneHandle | null)[]
  augen: BoneHandle[]
  mund: BoneHandle | null
  naechstesBlinzeln: number
  blinzelStart: number
  doppelt: boolean
  blick: number
}

interface BoneHandle {
  bone: THREE.Bone
  setze: (nicken: number, gieren: number, rollen?: number) => void
  hoehe: (f: number) => void
}

export default function BeeDuo3D({ modelle }: BeeDuo3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (cleanupRef.current) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

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

    // --- Szene ---
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

    // --- Knochen-Setup ---
    const _d = new THREE.Quaternion()
    const _e = new THREE.Euler(0, 0, 0, 'YXZ')

    function knochenSetup(gltfScene: THREE.Group, name: string): BoneHandle | null {
      const k = gltfScene.getObjectByName(name)
      if (!k || !(k as THREE.Bone).isBone) return null
      const bone = k as THREE.Bone
      const ruhe = bone.quaternion.clone()
      const P = gltfScene.getWorldQuaternion(new THREE.Quaternion()).invert()
        .multiply(bone.parent!.getWorldQuaternion(new THREE.Quaternion()))
      const Pi = P.clone().invert()
      // Achse fuer Augen/Mund: welche lokale Achse zeigt im Modell nach oben?
      const oben = new THREE.Vector3(0, 1, 0).applyQuaternion(
        gltfScene.getWorldQuaternion(new THREE.Quaternion()).invert()
          .multiply(bone.getWorldQuaternion(new THREE.Quaternion())).invert(),
      )
      const a = [Math.abs(oben.x), Math.abs(oben.y), Math.abs(oben.z)]
      const achse = (['x', 'y', 'z'] as const)[a.indexOf(Math.max(...a))]
      return {
        bone,
        setze(nicken: number, gieren: number, rollen = 0) {
          _d.setFromEuler(_e.set(-nicken, gieren, rollen, 'YXZ'))
          bone.quaternion.copy(Pi).multiply(_d).multiply(P).multiply(ruhe)
        },
        hoehe(f: number) {
          bone.scale.set(1, 1, 1)
          ;(bone.scale as unknown as Record<string, number>)[achse] = f
        },
      }
    }

    // --- Modell laden und Insekt erstellen ---
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)

    async function ladeInsekt(url: string, nr: number): Promise<Insekt> {
      const gltf = await loader.loadAsync(url)
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

      gltf.scene.updateMatrixWorld(true)
      const kopfK = knochenSetup(gltf.scene, 'Kopf')
      const fuehler = [knochenSetup(gltf.scene, 'Fuehler_L'), knochenSetup(gltf.scene, 'Fuehler_R')]
      const augen = [knochenSetup(gltf.scene, 'Auge_L'), knochenSetup(gltf.scene, 'Auge_R')].filter(Boolean) as BoneHandle[]
      const mund = knochenSetup(gltf.scene, 'Mund')

      // --- Jahresfarbe (nur fuer Modelle mit Rumpf-Bone) ---
      const rumpfBone = gltf.scene.getObjectByName('Rumpf')
      if (rumpfBone) {
        const jahresfarben: Record<number, number> = {
          0: 0x0055ff, 1: 0xffffff, 2: 0xffdd00, 3: 0xdd0000, 4: 0x00aa00,
        }
        const jahrFarbe = jahresfarben[new Date().getFullYear() % 5]
        const scheibeGeo = new THREE.CircleGeometry(0.06, 24)
        const scheibeMat = new THREE.MeshStandardMaterial({
          color: jahrFarbe,
          roughness: 0.3,
          metalness: 0.1,
          side: THREE.DoubleSide,
        })
        const scheibe = new THREE.Mesh(scheibeGeo, scheibeMat)
        scheibe.position.set(0, 0.42, 0.12)
        scheibe.rotation.x = -Math.PI / 2.3
        rumpfBone.add(scheibe)
        new THREE.TextureLoader().load('/Koerbee_Logo.png', (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          scheibeMat.map = tex
          scheibeMat.needsUpdate = true
        })
      }

      return {
        biene,
        schweben,
        scene: gltf.scene,
        geschw: new THREE.Vector3(CONFIG.tempo, 0, 0),
        ziel: neuesZiel(),
        gieren: Math.PI / 2,
        nicken: 0,
        neigung: 0,
        kopfGieren: 0,
        kopfNicken: 0,
        phase: Math.random() * 10,
        seite: nr % 2 ? 1 : -1,
        fluegel,
        kopfK,
        fuehler,
        augen,
        mund,
        naechstesBlinzeln: 1 + Math.random() * 3,
        blinzelStart: -1,
        doppelt: false,
        blick: 0,
      }
    }

    // --- Fluglogik ---
    function ausrichten(ich: Insekt, richtung: THREE.Vector3, dt: number) {
      const horiz = Math.hypot(richtung.x, richtung.z)
      const gewicht = horiz / Math.max(richtung.length(), 1e-6)
      const zielGieren = Math.atan2(richtung.x, richtung.z)
      const maxSchritt = rad(CONFIG.maxDrehung) * dt * gewicht * gewicht
      const schritt = klemme(winkelDiff(zielGieren, ich.gieren), -maxSchritt, maxSchritt)
      ich.gieren += schritt
      const zielNicken = klemme(
        -Math.atan2(richtung.y, Math.max(horiz, 1e-6)),
        -rad(CONFIG.maxNicken), rad(CONFIG.maxNicken),
      )
      ich.nicken += (zielNicken - ich.nicken) * Math.min(1, dt * 4)
      const zielNeigung = klemme(
        -(schritt / Math.max(dt, 1e-4)) * 0.35,
        -rad(CONFIG.maxNeigung), rad(CONFIG.maxNeigung),
      )
      ich.neigung += (zielNeigung - ich.neigung) * Math.min(1, dt * 4)
      ich.biene.rotation.set(ich.nicken, ich.gieren, ich.neigung)
    }

    function freiFliegen(ich: Insekt, dt: number) {
      const zumZiel = ich.ziel.clone().sub(ich.biene.position)
      if (zumZiel.length() < 0.8) ich.ziel = neuesZiel()
      const wunsch = zumZiel.normalize().multiplyScalar(CONFIG.tempo)
      ich.geschw.lerp(wunsch, Math.min(1, dt * 1.2))
      ich.geschw.setLength(CONFIG.tempo)
      ich.biene.position.addScaledVector(ich.geschw, dt)
      ausrichten(ich, ich.geschw, dt)
    }

    function begleiten(ich: Insekt, fuehrer: Insekt, dt: number, zeit: number) {
      if (Math.random() < dt / 9) ich.seite *= -1
      const w = zeit * 0.6 + ich.phase
      const seitlich = CONFIG.begleitAbstand * ich.seite + 0.5 * Math.sin(w)
      const lokal = new THREE.Vector3(seitlich, 0.35 * Math.sin(w * 1.3), -0.9 + 0.5 * Math.cos(w))
      const platz = lokal
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), fuehrer.gieren)
        .add(fuehrer.biene.position)
      const zumPlatz = platz.sub(ich.biene.position)
      const wunsch = fuehrer.geschw.clone().addScaledVector(zumPlatz, 1.4)
      const nah = ich.biene.position.clone().sub(fuehrer.biene.position)
      if (nah.length() < 1.0) wunsch.addScaledVector(nah.normalize(), 2.0)
      wunsch.clampLength(0.6, CONFIG.tempo * 1.8)
      ich.geschw.lerp(wunsch, Math.min(1, dt * 2.5))
      ich.biene.position.addScaledVector(ich.geschw, dt)
      ausrichten(ich, ich.geschw, dt)
    }

    const _v = new THREE.Vector3()
    const _q = new THREE.Quaternion()
    const VORNE = new THREE.Vector3(0, 0, 1)

    function animieren(ich: Insekt, dt: number, zeit: number) {
      const t = zeit + ich.phase

      // Fluegel
      const schlag = rad(CONFIG.fluegelAmplitude) * Math.sin(t * CONFIG.fluegelFrequenz * 2 * Math.PI)
      for (const [f, vorz] of ich.fluegel) if (f) f.rotation.z = vorz * schlag

      // Schweben
      ich.schweben.position.y = 0.05 * Math.sin(t * 2 * Math.PI)
      ich.schweben.rotation.x = rad(4) * Math.cos(t * 2 * Math.PI)

      // Kopf zum Betrachter
      if (ich.kopfK) {
        ich.biene.updateMatrixWorld(true)
        const lokal = kamera.position
          .clone()
          .sub(ich.kopfK.bone.getWorldPosition(_v))
          .applyQuaternion(ich.scene.getWorldQuaternion(_q).invert())
        const winkel = THREE.MathUtils.radToDeg(lokal.angleTo(VORNE))
        ich.blick = klemme(
          (CONFIG.kopfGeradeAb - winkel) / (CONFIG.kopfGeradeAb - CONFIG.kopfBlickBis), 0, 1,
        )
        const zG = ich.blick * klemme(Math.atan2(lokal.x, lokal.z), -rad(CONFIG.kopfMaxGieren), rad(CONFIG.kopfMaxGieren))
        const zN = ich.blick * klemme(
          Math.atan2(lokal.y, Math.hypot(lokal.x, lokal.z)),
          -rad(CONFIG.kopfMaxNicken), rad(CONFIG.kopfMaxNicken),
        )
        const k = Math.min(1, dt * 4)
        ich.kopfGieren += (zG - ich.kopfGieren) * k
        ich.kopfNicken += (zN - ich.kopfNicken) * k
        ich.kopfK.setze(ich.kopfNicken, ich.kopfGieren)
      }

      // Fuehler
      ich.fuehler.forEach((f, i) => {
        if (!f) return
        const w = t * CONFIG.fuehlerFrequenz * 2 * Math.PI + i * 1.3
        f.setze(
          rad(CONFIG.fuehlerWippen) * Math.sin(w),
          rad(CONFIG.fuehlerWippen) * 0.5 * Math.sin(w * 0.7 + 0.5),
        )
      })

      // Blinzeln (nur wenn Augen-Bones vorhanden)
      if (ich.augen.length) {
        if (zeit >= ich.naechstesBlinzeln) {
          ich.blinzelStart = zeit
          ich.doppelt = Math.random() < 0.2
          ich.naechstesBlinzeln = zeit + THREE.MathUtils.randFloat(...CONFIG.blinzelnAlle)
        }
        let zu = 0
        const starts = ich.doppelt
          ? [ich.blinzelStart, ich.blinzelStart + 0.3]
          : [ich.blinzelStart]
        for (const start of starts) {
          const p = (zeit - start) / 0.18
          if (p >= 0 && p <= 1) zu = Math.max(zu, Math.sin(p * Math.PI))
        }
        for (const a of ich.augen) a.hoehe(1 - 0.92 * zu)
      }

      // Mund (nur wenn Mund-Bone vorhanden)
      if (ich.mund) {
        ich.mund.hoehe(
          Math.min(1.15, 1 + CONFIG.mundSpiel * Math.sin(t * 1.3) + CONFIG.mundLachen * ich.blick * 0.5),
        )
      }
    }

    // --- Aufstellung ---
    function aufstellen(insekten: Insekt[], links: boolean) {
      const start = pixelZuWelt(
        links ? -100 : innerWidth + 100,
        innerHeight * (0.15 + Math.random() * 0.45),
        -7,
      )
      insekten.forEach((ich, nr) => {
        ich.biene.position.copy(start).add(new THREE.Vector3(0, nr * 0.3, nr * -1.0))
        if (nr) ich.biene.position.x += (links ? -1 : 1) * 1.2 * nr
        ich.geschw.set(links ? CONFIG.tempo : -CONFIG.tempo, 0, 0)
        ich.gieren = links ? Math.PI / 2 : -Math.PI / 2
        ich.biene.scale.setScalar(1)
        ich.biene.visible = true
        ich.ziel = neuesZiel()
      })
    }

    // --- Warenkorb-Flug ---
    function zumWarenkorb(insekten: Insekt[]) {
      const korb = document.querySelector('#cart-icon')
      if (!korb) return
      const fuehrer = insekten[0]
      const [kx, ky] = elementMitte(korb)

      insekten.forEach((ich, nr) => {
        const versatz = nr * 60
        const punkte = [
          ich.biene.position.clone(),
          pixelZuWelt(innerWidth / 2 + versatz, innerHeight * 0.3 - versatz * 0.3, 2.5),
          pixelZuWelt((innerWidth / 2 + kx) / 2, Math.min(innerHeight * 0.3, ky) - 80 - versatz, 3.5),
          pixelZuWelt(kx, ky, 5.5),
        ]
        const kurve = new THREE.CatmullRomCurve3(punkte, false, 'centripetal')
        const dauer = klemme(kurve.getLength() / CONFIG.tempoWarenkorb, 1.4, 3.2)

        let korbT = 0
        let wartezeit = nr * 0.45
        const korbModus = { aktiv: true }

        function korbSchritt(dt: number, zeit: number) {
          if (!korbModus.aktiv) return false
          if (wartezeit > 0) {
            wartezeit -= dt
            if (nr > 0) begleiten(ich, fuehrer, dt, zeit)
            return true
          }
          korbT = Math.min(1, korbT + dt / dauer)
          const s = korbT < 0.5 ? 2 * korbT * korbT : 1 - Math.pow(-2 * korbT + 2, 2) / 2
          const neu = kurve.getPointAt(s)
          const richtung = neu.clone().sub(ich.biene.position)
          if (richtung.lengthSq() > 1e-8) ausrichten(ich, richtung, dt)
          ich.biene.position.copy(neu)
          ich.biene.scale.setScalar(s < 0.75 ? 1 : Math.max(0.001, 1 - (s - 0.75) / 0.25))
          if (korbT >= 1) {
            ich.biene.visible = false
            korbModus.aktiv = false
          }
          return true
        }
        ;(ich as Insekt & { korbSchritt?: typeof korbSchritt }).korbSchritt = korbSchritt
      })
    }

    // --- Laden & Animationsschleife ---
    Promise.all(modelle.map((url, nr) => ladeInsekt(url, nr))).then((insekten) => {
      if (!laeuft) return
      const fuehrer = insekten[0]
      aufstellen(insekten, true)

      let zeit = 0
      let modus: 'frei' | 'warenkorb' | 'pause' = 'frei'
      const uhr = new THREE.Clock()

      const onAddToCart = () => {
        if (modus !== 'frei') return
        modus = 'warenkorb'
        zumWarenkorb(insekten)
      }
      window.addEventListener('korbee:add-to-cart', onAddToCart)

      renderer.setAnimationLoop(() => {
        if (!laeuft) return
        const dt = Math.min(uhr.getDelta(), 0.05)
        zeit += dt

        if (modus === 'frei') {
          freiFliegen(fuehrer, dt)
          for (let i = 1; i < insekten.length; i++) {
            begleiten(insekten[i], fuehrer, dt, zeit)
          }
        } else if (modus === 'warenkorb') {
          let alleFertig = true
          for (const ich of insekten) {
            const ks = (ich as Insekt & { korbSchritt?: (dt: number, zeit: number) => boolean }).korbSchritt
            if (ks?.(dt, zeit)) alleFertig = false
          }
          if (alleFertig) {
            modus = 'pause'
            setTimeout(() => {
              aufstellen(insekten, Math.random() < 0.5)
              modus = 'frei'
            }, 1500)
          }
        }

        for (const ich of insekten) {
          animieren(ich, dt, zeit)
        }

        renderer.render(szene, kamera)
      })

      // Cleanup erweitern
      cleanupRef.current = () => {
        laeuft = false
        renderer.setAnimationLoop(null)
        renderer.domElement.remove()
        renderer.dispose()
        removeEventListener('resize', groesse)
        window.removeEventListener('korbee:add-to-cart', onAddToCart)
      }
    })

    // Initial cleanup (vor Modell-Laden)
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
  }, [modelle])

  return <div ref={wrapperRef} />
}
