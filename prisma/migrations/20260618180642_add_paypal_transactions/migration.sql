-- CreateTable
CREATE TABLE "PayPalTransaction" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "payerName" TEXT,
    "payerEmail" TEXT,
    "paypalStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "saleId" TEXT,
    "consignmentId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayPalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayPalSyncState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayPalSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayPalTransaction_userId_transactionId_key" ON "PayPalTransaction"("userId", "transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PayPalSyncState_userId_key" ON "PayPalSyncState"("userId");

-- AddForeignKey
ALTER TABLE "PayPalTransaction" ADD CONSTRAINT "PayPalTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayPalSyncState" ADD CONSTRAINT "PayPalSyncState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
