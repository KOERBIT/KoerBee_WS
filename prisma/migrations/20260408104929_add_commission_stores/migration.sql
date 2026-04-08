-- AlterTable
ALTER TABLE "Consignment" ADD COLUMN     "commissionStoreId" TEXT;

-- CreateTable
CREATE TABLE "CommissionStore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionStore_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommissionStore" ADD CONSTRAINT "CommissionStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_commissionStoreId_fkey" FOREIGN KEY ("commissionStoreId") REFERENCES "CommissionStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
