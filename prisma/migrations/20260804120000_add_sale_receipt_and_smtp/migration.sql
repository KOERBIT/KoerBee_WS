-- AlterTable
ALTER TABLE "MailCredential" ADD COLUMN     "smtpHost" TEXT NOT NULL DEFAULT 'mail.gmx.net',
ADD COLUMN     "smtpPort" INTEGER NOT NULL DEFAULT 587;

-- CreateTable
CREATE TABLE "SaleReceipt" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'bar',
    "recipient" TEXT,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleReceipt_saleId_key" ON "SaleReceipt"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleReceipt_userId_number_key" ON "SaleReceipt"("userId", "number");

-- AddForeignKey
ALTER TABLE "SaleReceipt" ADD CONSTRAINT "SaleReceipt_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
