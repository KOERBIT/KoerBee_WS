-- CreateTable
CREATE TABLE IF NOT EXISTS "HoneyBucket" (
    "userId" TEXT NOT NULL,
    "sizeKg" INTEGER NOT NULL,
    "tareKg" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoneyBucket_pkey" PRIMARY KEY ("userId","sizeKg")
);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "HoneyBucket" ADD CONSTRAINT "HoneyBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
