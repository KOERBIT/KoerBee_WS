/**
 * @jest-environment node
 */
import { t } from '@/lib/shop/i18n'

describe('i18n', () => {
  it('returns German translation by default', () => {
    expect(t('de', 'shop.title')).toBe('Imkerei-Shop')
  })

  it('returns English translation', () => {
    expect(t('en', 'shop.title')).toBe('Beekeeping Shop')
  })

  it('falls back to German when English key is missing', () => {
    expect(typeof t('en', 'shop.title')).toBe('string')
  })

  it('returns the key itself when not found in any locale', () => {
    expect(t('de', 'nonexistent.key')).toBe('nonexistent.key')
  })
})
