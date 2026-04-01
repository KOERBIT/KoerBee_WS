import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bee</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600">
            {session.user?.name ?? session.user?.email}
          </span>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Abmelden
            </button>
          </form>
        </div>
      </header>
      <main className="px-6 py-8">
        <p className="text-zinc-500">Dashboard — kommt bald.</p>
      </main>
    </div>
  )
}
