'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const footerLinks = [
  { href: '/shop', label: 'Shop' },
  { href: '/blog', label: 'Blog' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/widerruf', label: 'Widerruf' },
  { href: '/versand', label: 'Versand & Zahlung' },
]

export default function KontaktPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Etwas ist schiefgelaufen.')
        setStatus('error')
        return
      }
      setStatus('sent')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      setErrorMsg('Verbindungsfehler. Bitte versuchen Sie es erneut.')
      setStatus('error')
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid var(--shop-border)',
    background: 'var(--shop-bg)',
    color: 'var(--shop-ink)',
    fontSize: '.95rem',
    fontFamily: 'var(--font-manrope), system-ui, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--shop-bg)',
        color: 'var(--shop-ink)',
        fontFamily: 'var(--font-manrope), system-ui, sans-serif',
      }}
    >

      {/* Header */}
      <header className="px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={32} height={32} className="rounded-lg" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: 'var(--font-caveat), cursive', fontWeight: 700, fontSize: '1.6rem', color: 'var(--shop-ink)' }}>
              KörBee
            </span>
          </Link>
          <span style={{ fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--shop-dim)' }}>
            Imkerei
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', marginBottom: 8 }}>
            Kontakt
          </h1>
          <p style={{ fontSize: '1.05rem', marginBottom: 32, color: 'var(--shop-dim)' }}>
            Sie haben Fragen zu unseren Produkten, Ihrer Bestellung oder möchten Honig abholen? Schreiben Sie uns gerne!
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Contact Info */}
            <div className="lg:col-span-2">
              <div
                className="rounded-[20px] p-6"
                style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', boxShadow: 'var(--shop-shadow)' }}
              >
                <p style={{ fontWeight: 700, color: 'var(--shop-ink)', fontSize: '1.05rem', marginBottom: 16 }}>
                  KörBee Imkerei
                </p>
                <div style={{ fontSize: '.9rem', color: 'var(--shop-dim)', lineHeight: 1.8 }}>
                  <p>Thomas Körbe</p>
                  <p>Goethestr. 6</p>
                  <p>35625 Hüttenberg</p>
                  <p style={{ marginTop: 16 }}>
                    <a href="mailto:Imker.KoerBee@gmx.de" style={{ color: 'var(--shop-accent)', textDecoration: 'none', fontWeight: 600 }}>
                      Imker.KoerBee@gmx.de
                    </a>
                  </p>
                </div>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--shop-border)', fontSize: '.82rem', color: 'var(--shop-dim)' }}>
                  <p>Wir antworten in der Regel innerhalb von 1–2 Werktagen.</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div
                className="rounded-[20px] p-6 sm:p-8"
                style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', boxShadow: 'var(--shop-shadow)' }}
              >
                {status === 'sent' ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">&#10003;</div>
                    <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>Nachricht gesendet!</h2>
                    <p style={{ color: 'var(--shop-dim)', fontSize: '.95rem' }}>
                      Vielen Dank für Ihre Nachricht. Wir melden uns schnellstmöglich bei Ihnen.
                    </p>
                    <button
                      onClick={() => setStatus('idle')}
                      style={{
                        marginTop: 20,
                        padding: '10px 24px',
                        borderRadius: 12,
                        background: 'var(--shop-ink)',
                        color: 'var(--shop-bg)',
                        fontWeight: 600,
                        fontSize: '.9rem',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Weitere Nachricht senden
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: 'var(--shop-ink)', marginBottom: 6 }}>
                            Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Ihr Name"
                            style={inputStyle}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.1)' }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: 'var(--shop-ink)', marginBottom: 6 }}>
                            E-Mail *
                          </label>
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="ihre@email.de"
                            style={inputStyle}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.1)' }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: 'var(--shop-ink)', marginBottom: 6 }}>
                          Betreff *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          placeholder="Worum geht es?"
                          style={inputStyle}
                          onFocus={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.1)' }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, color: 'var(--shop-ink)', marginBottom: 6 }}>
                          Nachricht *
                        </label>
                        <textarea
                          required
                          rows={5}
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          placeholder="Ihre Nachricht..."
                          style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.1)' }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                        />
                      </div>

                      <p style={{ fontSize: '.78rem', color: 'var(--shop-dim)', lineHeight: 1.5 }}>
                        Mit dem Absenden stimmen Sie zu, dass Ihre Angaben zur Bearbeitung Ihrer Anfrage verwendet werden.
                        Weitere Informationen finden Sie in unserer{' '}
                        <Link href="/datenschutz" style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}>
                          Datenschutzerklärung
                        </Link>.
                      </p>

                      {status === 'error' && (
                        <div style={{ padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '.9rem' }}>
                          {errorMsg}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={status === 'sending'}
                        style={{
                          padding: '12px 24px',
                          borderRadius: 12,
                          background: status === 'sending' ? '#a1a1aa' : '#d97706',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '.95rem',
                          border: 'none',
                          cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                          transition: 'background 0.2s',
                          fontFamily: 'var(--font-manrope), system-ui, sans-serif',
                        }}
                      >
                        {status === 'sending' ? 'Wird gesendet...' : 'Nachricht senden'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-10" style={{ borderTop: '1px solid var(--shop-border)', fontSize: '.82rem', color: 'var(--shop-dim)' }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
              <Image src="/Koerbee_Logo.png" alt="KörBee" width={24} height={24} className="rounded-md" style={{ objectFit: 'contain' }} />
              <span style={{ fontFamily: 'var(--font-caveat), cursive', fontWeight: 700, fontSize: '1.4rem', color: 'var(--shop-ink)' }}>
                KörBee
              </span>
            </Link>
            <span style={{ fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>Imkerei</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-center">
            {footerLinks.map((l) => (
              <Link key={l.href} href={l.href} style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="hover:opacity-70 transition-opacity">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
