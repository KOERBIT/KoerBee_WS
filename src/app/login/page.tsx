'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Image from 'next/image'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('callbackUrl') ?? '/dashboard'
  const callbackUrl = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('E-Mail oder Passwort falsch')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg mb-4">
          <Image
            src="/Koerbee_Logo.jpg"
            alt="KörBee Logo"
            width={80}
            height={80}
            className="object-cover w-full h-full"
          />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">KörBee</h1>
        <p className="text-[14px] text-zinc-500 mt-1">Melde dich in deinem Konto an</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 px-7 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-zinc-700">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-zinc-700">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-colors"
            />
          </div>
          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
              <p className="text-[13px] text-rose-600 text-center">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-[14px] font-semibold disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Wird eingeloggt…' : 'Anmelden'}
          </button>
        </form>
      </div>

      <p className="text-center text-[12px] text-zinc-400 mt-6">
        KörBee Imkerei-Verwaltung
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
      <Suspense fallback={
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 text-center text-zinc-400 text-[14px]">
          Laden…
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
