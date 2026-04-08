-- CreateTable
CREATE TABLE "StockCorrection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCorrection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
