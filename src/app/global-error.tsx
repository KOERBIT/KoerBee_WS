'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fffbeb', color: '#27272a' }}>
        <main style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>🐝</div>
          <h1 style={{ fontSize: 20, margin: 0 }}>Da ist etwas schiefgelaufen</h1>
          <p style={{ fontSize: 14, color: '#71717a', margin: 0 }}>
            Die Anwendung konnte nicht geladen werden. Bitte versuche es erneut.
          </p>
          <button
            onClick={() => retry()}
            style={{
              background: '#f59e0b', color: '#fff', border: 0, borderRadius: 12,
              padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Erneut versuchen
          </button>
        </main>
      </body>
    </html>
  )
}
