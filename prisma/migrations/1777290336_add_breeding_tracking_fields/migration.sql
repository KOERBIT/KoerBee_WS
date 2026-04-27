-- AlterTable
ALTER TABLE "BreedingBatch" ADD COLUMN "larvaeGrafted" INTEGER,
ADD COLUMN "larvaeAccepted" INTEGER,
ADD COLUMN "queensHatched" INTEGER,
ADD COLUMN "queensMated" INTEGER;

-- AlterTable
ALTER TABLE "BreedingEvent" ADD COLUMN "eventValue" INTEGER,
ADD COLUMN "eventNotes" TEXT;
