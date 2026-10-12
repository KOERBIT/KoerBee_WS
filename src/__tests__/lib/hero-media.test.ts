import { resolveHeroAnimation, HERO_ANIMATIONS } from '@/lib/hero-media'

describe('resolveHeroAnimation', () => {
  it('nimmt die live geschaltete Animation', () => {
    expect(resolveHeroAnimation({ 'hero.animation': 'flying-bees' }).kind).toBe('flying-bees')
    expect(resolveHeroAnimation({ 'hero.animation': 'none' }).kind).toBe('none')
  })
  it('leitet bei alten Daten das Maskottchen aus mascot.modell ab', () => {
    expect(resolveHeroAnimation({ 'mascot.modell': '/biene-realistisch.glb' }).id).toBe('mascot-v3')
  })
  it('hero.animation hat Vorrang vor mascot.modell', () => {
    expect(resolveHeroAnimation({ 'hero.animation': 'flying-bees', 'mascot.modell': '/biene.glb' }).id).toBe('flying-bees')
  })
  it('Standard bzw. unbekannte Werte → Chibi-Königin V2', () => {
    expect(resolveHeroAnimation({}).id).toBe('mascot-v2')
    expect(resolveHeroAnimation({ 'hero.animation': 'gibts-nicht' }).id).toBe('mascot-v2')
  })
  it('IDs sind eindeutig', () => {
    expect(new Set(HERO_ANIMATIONS.map(a => a.id)).size).toBe(HERO_ANIMATIONS.length)
  })
})
