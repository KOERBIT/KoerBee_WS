'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { Locale } from '@/lib/shop/i18n'

/**
 * Zwei echte 3D-Bienen fliegen frei über die Startseite – im selben Stil wie das
 * 3D-Maskottchen (BeeMascot3D): Die Sportliche sucht sich laufend neue Ziele im Raum,
 * der Müde trödelt ihr hinterher und beschwert sich ab und zu per Sprechblase.
 *
 * Flügel, Kopf, Beine und Fühler bewegt die in Blender erstellte Animation in den GLBs
 * (animation/flug im Projektordner); Flugbahn und Ausrichtung kommen von hier.
 *
 * Ton: wird in der Verwaltung (Inhalte → Hero-Animation) hochgeladen und kommt als
 * `soundUrl`. Browser spielen Ton nur nach einer Nutzeraktion ab – deshalb ertönt er
 * beim Antippen der müden Biene.
 */

const LINE: Record<Locale, string> = {
  de: 'Ich bin so müde!',
  en: "I'm so tired!",
}

const CONFIG = {
  groesse: 0.7, // Skalierung der Modelle (1 = Blender-Größe, ~1,9 Einheiten)
  tempoSporty: 2.2, // Welt-Einheiten pro Sekunde
  tempoSleepy: 1.7,
  abstand: 1.7, // so weit hängt der Müde hinterher
  mindestAbstand: 1.1, // näher kommen sich die beiden nie
  maxDrehung: 140, // Grad pro Sekunde
  maxNicken: 18,
  maxNeigung: 18,
  sprechPause: [9, 16], // Sekunden zwischen zwei Sprechblasen (zufällig)
  sprechDauer: 3.5,
}

const rad = THREE.MathUtils.degToRad
const klemme = THREE.MathUtils.clamp
const winkelDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

interface Flieger {
  gruppe: THREE.Group
  geschw: THREE.Vector3
  gieren: number
  nicken: number
  neigung: number
  mixer: THREE.AnimationMixer
  kopf: THREE.Object3D | null
}

export default function FlyingBees({ locale, soundUrl }: { locale: Locale; soundUrl?: string }) {
  const blaseRef = useRef<HTMLDivElement>(null)
  const [redet, setRedet] = useState(false)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let laeuft = true

    // --- Renderer (eigene Ebene, unter dem Maskottchen) ---
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    Object.assign(renderer.domElement.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '55',
    })
    document.body.appendChild(renderer.domElement)

    // --- Szene: gleiches Licht wie beim Maskottchen ---
    const szene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    szene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
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
      const ndc = new THREE.Vector3((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1, 0.5)
      const richtung = ndc.unproject(kamera).sub(kamera.position).normalize()
      const t = (tiefe - kamera.position.z) / richtung.z
      return kamera.position.clone().addScaledVector(richtung, t)
    }

    const _p = new THREE.Vector3()
    function weltZuPixel(v: THREE.Vector3): [number, number] {
      _p.copy(v).project(kamera)
      return [((_p.x + 1) / 2) * innerWidth, ((1 - _p.y) / 2) * innerHeight]
    }

    function zufallsPunkt() {
      return pixelZuWelt(
        innerWidth * (0.5 + THREE.MathUtils.randFloatSpread(0.8)),
        innerHeight * (0.5 + THREE.MathUtils.randFloatSpread(0.7)),
        THREE.MathUtils.randFloat(-6, 2),
      )
    }

    // Ausrichtung wie beim Maskottchen: gieren begrenzt, nicken/neigen weich
    function ausrichten(f: Flieger, richtung: THREE.Vector3, dt: number) {
      const horiz = Math.hypot(richtung.x, richtung.z)
      const gewicht = horiz / Math.max(richtung.length(), 1e-6)
      const zielGieren = Math.atan2(richtung.x, richtung.z)
      const maxSchritt = rad(CONFIG.maxDrehung) * dt * gewicht * gewicht
      const schritt = klemme(winkelDiff(zielGieren, f.gieren), -maxSchritt, maxSchritt)
      f.gieren += schritt
      const zielNicken = klemme(-Math.atan2(richtung.y, Math.max(horiz, 1e-6)), -rad(CONFIG.maxNicken), rad(CONFIG.maxNicken))
      f.nicken += (zielNicken - f.nicken) * Math.min(1, dt * 4)
      const zielNeigung = klemme(-(schritt / Math.max(dt, 1e-4)) * 0.35, -rad(CONFIG.maxNeigung), rad(CONFIG.maxNeigung))
      f.neigung += (zielNeigung - f.neigung) * Math.min(1, dt * 4)
      f.gruppe.rotation.set(f.nicken, f.gieren, f.neigung)
    }

    function fliegeZu(f: Flieger, ziel: THREE.Vector3, tempo: number, dt: number) {
      const zumZiel = ziel.clone().sub(f.gruppe.position)
      const dist = zumZiel.length()
      const soll = Math.min(tempo, dist * 1.2) // vor dem Ziel abbremsen
      f.geschw.lerp(zumZiel.normalize().multiplyScalar(soll), Math.min(1, dt * (dist < 2 ? 3 : 1.2)))
      f.gruppe.position.addScaledVector(f.geschw, dt)
      if (f.geschw.lengthSq() > 0.01) ausrichten(f, f.geschw, dt)
      return dist
    }

    // --- Modelle laden ---
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    async function lade(url: string): Promise<Flieger> {
      const gltf = await loader.loadAsync(url)
      const gruppe = new THREE.Group()
      gruppe.rotation.order = 'YXZ'
      gltf.scene.scale.setScalar(CONFIG.groesse)
      gltf.scene.traverse((k) => {
        if ((k as THREE.SkinnedMesh).isSkinnedMesh) (k as THREE.SkinnedMesh).frustumCulled = false
      })
      gruppe.add(gltf.scene)
      szene.add(gruppe)
      const mixer = new THREE.AnimationMixer(gltf.scene)
      if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play()
      return {
        gruppe,
        geschw: new THREE.Vector3(),
        gieren: Math.PI / 2,
        nicken: 0,
        neigung: 0,
        mixer,
        kopf: gltf.scene.getObjectByName('head') ?? null,
      }
    }

    // Klick/Tipp auf den Müden (die Ebene selbst lässt Klicks durch)
    let sleepyRef: Flieger | null = null
    let audio: HTMLAudioElement | null = null
    let sprechBis = 0
    let zeit = 0
    function antippen(e: PointerEvent) {
      if (!sleepyRef) return
      const [x, y] = weltZuPixel(sleepyRef.gruppe.position)
      if (Math.hypot(e.clientX - x, e.clientY - y) > 70) return
      sprechBis = zeit + CONFIG.sprechDauer
      if (soundUrl) {
        audio ??= new Audio(soundUrl)
        audio.currentTime = 0
        void audio.play().catch(() => {})
      }
    }
    addEventListener('pointerdown', antippen)

    Promise.all([lade('/landing/bee-sporty-fly.glb'), lade('/landing/bee-sleepy-fly.glb')]).then(([sporty, sleepy]) => {
      if (!laeuft) return
      sleepyRef = sleepy
      sporty.gruppe.position.copy(pixelZuWelt(-120, innerHeight * 0.3, -4))
      sleepy.gruppe.position.copy(pixelZuWelt(-320, innerHeight * 0.4, -4))
      sporty.geschw.set(CONFIG.tempoSporty, 0, 0)
      sleepy.geschw.set(CONFIG.tempoSleepy, 0, 0)

      let ziel = zufallsPunkt()
      let naechsteRede = THREE.MathUtils.randFloat(CONFIG.sprechPause[0], CONFIG.sprechPause[1])
      let zeigt = false
      const uhr = new THREE.Timer()
      const _hinten = new THREE.Vector3()
      const _kopf = new THREE.Vector3()
      const _abstand = new THREE.Vector3()

      renderer.setAnimationLoop((zeitstempel) => {
        if (!laeuft) return
        uhr.update(zeitstempel)
        const dt = Math.min(uhr.getDelta(), 0.05)
        zeit += dt

        // Sportliche: von Ziel zu Ziel
        if (fliegeZu(sporty, ziel, CONFIG.tempoSporty, dt) < 1.2) ziel = zufallsPunkt()

        // Müder: Punkt hinter ihr, etwas tiefer, sackt immer wieder durch
        const vorne = new THREE.Vector3(Math.sin(sporty.gieren), 0, Math.cos(sporty.gieren))
        _hinten
          .copy(sporty.gruppe.position)
          .addScaledVector(vorne, -CONFIG.abstand)
          .add(new THREE.Vector3(0, -0.45 + 0.3 * Math.sin(zeit * 0.8), 0))
        fliegeZu(sleepy, _hinten, CONFIG.tempoSleepy, dt)
        // nicht durch sie hindurchfliegen, wenn sie wendet
        _abstand.subVectors(sleepy.gruppe.position, sporty.gruppe.position)
        const naehe = _abstand.length()
        if (naehe < CONFIG.mindestAbstand) {
          sleepy.gruppe.position.addScaledVector(_abstand.normalize(), CONFIG.mindestAbstand - naehe)
        }

        sporty.mixer.update(dt)
        sleepy.mixer.update(dt * 0.9)

        // Sprechblase in zufälligen Abständen, folgt dem Kopf des Müden
        if (zeit > naechsteRede) {
          sprechBis = zeit + CONFIG.sprechDauer
          naechsteRede = zeit + CONFIG.sprechDauer + THREE.MathUtils.randFloat(CONFIG.sprechPause[0], CONFIG.sprechPause[1])
        }
        const sollZeigen = zeit < sprechBis
        if (sollZeigen !== zeigt) {
          zeigt = sollZeigen
          setRedet(sollZeigen)
        }
        const blase = blaseRef.current
        if (blase) {
          ;(sleepy.kopf ?? sleepy.gruppe).getWorldPosition(_kopf)
          const [x, y] = weltZuPixel(_kopf)
          const bx = klemme(x, 70, innerWidth - 90)
          blase.style.transform = `translate3d(${bx}px, ${y - 70}px, 0)`
        }

        renderer.render(szene, kamera)
      })
    })

    return () => {
      laeuft = false
      renderer.setAnimationLoop(null)
      renderer.domElement.remove()
      renderer.dispose()
      pmrem.dispose()
      removeEventListener('resize', groesse)
      removeEventListener('pointerdown', antippen)
    }
  }, [soundUrl])

  return (
    <div ref={blaseRef} className="bee-bubble-anchor" aria-hidden="true">
      <div className={`bee-bubble${redet ? ' is-talking' : ''}`}>{LINE[locale]}</div>
    </div>
  )
}
