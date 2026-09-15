import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const products = await prisma.product.findMany({
    where: { shopVisible: true },
    select: {
      id: true,
      name: true,
      shopName: true,
      shopNameEn: true,
      description: true,
      descriptionEn: true,
      unit: true,
      price: true,
      shopPrice: true,
      imageUrl: true,
      fillAmount: true,
      fillUnit: true,
      shopSortOrder: true,
    },
    orderBy: { shopSortOrder: 'asc' },
  })

  return NextResponse.json(products)
}
