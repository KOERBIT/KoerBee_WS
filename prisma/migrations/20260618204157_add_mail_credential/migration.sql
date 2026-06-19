-- CreateTable
CREATE TABLE "MailCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL DEFAULT 'imap.gmx.net',
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapUser" TEXT NOT NULL,
    "imapPassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailCredential_userId_key" ON "MailCredential"("userId");

-- AddForeignKey
ALTER TABLE "MailCredential" ADD CONSTRAINT "MailCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
