import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    include: {
      colony: { select: { id: true, name: true } },
      apiary: { select: { id: true, name: true } },
    },
    orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, dueDate, priority, colonyId, apiaryId } = await req.json()
  if (!title) return NextResponse.json({ error: 'Titel fehlt' }, { status: 400 })

  const task = await prisma.task.create({
    data: {
      title,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority ?? 'normal',
      colonyId: colonyId ?? null,
      apiaryId: apiaryId ?? null,
      userId: session.user.id,
    },
    include: {
      colony: { select: { id: true, name: true } },
      apiary: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(task, { status: 201 })
}
