-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "commissionStoreId" TEXT,
ADD COLUMN     "consignmentId" TEXT;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_commissionStoreId_fkey" FOREIGN KEY ("commissionStoreId") REFERENCES "CommissionStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "Consignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
