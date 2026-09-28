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
      stockQuantity: true,
      userId: true,
    },
    orderBy: { shopSortOrder: 'asc' },
  })

  // Schwellenwert aus den Shop-Settings des Besitzers holen (fehlertolerant falls Tabelle noch nicht existiert)
  const ownerId = products[0]?.userId
  let stockLowThreshold = 5
  if (ownerId) {
    try {
      const settings = await prisma.shopSettings.findUnique({ where: { userId: ownerId } })
      if (settings) stockLowThreshold = settings.stockLowThreshold
    } catch {
      // Tabelle existiert noch nicht — Default verwenden
    }
  }

  // userId nicht an den Client senden
  const cleaned = products.map(({ userId: _, ...p }) => p)

  return NextResponse.json({ products: cleaned, stockLowThreshold })
}
