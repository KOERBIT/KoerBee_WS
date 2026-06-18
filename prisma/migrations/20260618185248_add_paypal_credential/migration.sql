-- CreateTable
CREATE TABLE "PayPalCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "apiBase" TEXT NOT NULL DEFAULT 'https://api-m.sandbox.paypal.com',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayPalCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayPalCredential_userId_key" ON "PayPalCredential"("userId");

-- AddForeignKey
ALTER TABLE "PayPalCredential" ADD CONSTRAINT "PayPalCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
