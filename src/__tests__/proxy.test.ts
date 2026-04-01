/**
 * @jest-environment node
 */

// Note: The plan specified `unstable_doesProxyMatch` (Next.js 16 docs name),
// but Next.js 16.2.1 only exports `unstable_doesMiddlewareMatch` (legacy name).
// Using the available function — functionally identical.
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { config } from '../../proxy'

describe('proxy matcher', () => {
  it('läuft NICHT für /login', () => {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: '/login' })
    ).toBe(false)
  })

  it('läuft NICHT für /api/auth/signin', () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: '/api/auth/signin',
      })
    ).toBe(false)
  })

  it('läuft NICHT für _next/static assets', () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: '/_next/static/chunks/main.js',
      })
    ).toBe(false)
  })

  it('läuft FÜR /dashboard', () => {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: '/dashboard' })
    ).toBe(true)
  })

  it('läuft FÜR /', () => {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: '/' })
    ).toBe(true)
  })
})
