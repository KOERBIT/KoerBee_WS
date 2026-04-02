import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Einstellungen</h1>
        <p className="text-zinc-500 text-[14px] mt-1">Konto- und App-Einstellungen</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-[15px] font-semibold text-zinc-900">Konto</h2>
        </div>
        <div className="divide-y divide-zinc-50">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-zinc-900">Name</p>
              <p className="text-[13px] text-zinc-400 mt-0.5">{session?.user?.name ?? '—'}</p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-zinc-900">E-Mail</p>
              <p className="text-[13px] text-zinc-400 mt-0.5">{session?.user?.email ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mt-6">
        <p className="text-[13px] font-medium text-amber-700">Weitere Einstellungen folgen</p>
        <p className="text-[12px] text-amber-600 mt-0.5">Passwort ändern, Benachrichtigungen, Abo-Plan — kommt in einem nächsten Update.</p>
      </div>
    </div>
  )
}
