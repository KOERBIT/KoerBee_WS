import { NextAuthOptions } from 'next-auth'
import { clientIp, rateLimitAll } from '@/lib/rate-limit'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: string
  }
}

export const authOptions: NextAuthOptions = {
  // PrismaAdapter handles OAuth provider flows (Account/Session models).
  // CredentialsProvider sessions use JWT only and are NOT persisted to DB.
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Brute-Force-Schutz: je IP+E-Mail und je IP (Fehlversuche wie Erfolge zählen)
        const ip = clientIp(req?.headers ?? {})
        const rl = await rateLimitAll([
          [`login:${ip}:${credentials.email.toLowerCase()}`, 10, 15 * 60],
          [`login-ip:${ip}`, 40, 15 * 60],
        ])
        if (!rl.ok) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          return null
        }

        if (!user.passwordHash) return null
        if (user.disabled) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'user'
        return token
      }
      if (token.id) {
        // Rolle und Sperre bei jeder Anfrage frisch aus der DB lesen, damit
        // Änderungen in der Nutzerverwaltung sofort wirken. Ein Fehler hier
        // beendet die Session (next-auth löscht das Cookie).
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, disabled: true },
        })
        if (!dbUser || dbUser.disabled) throw new Error('user_inactive')
        token.role = dbUser.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) ?? 'user'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
