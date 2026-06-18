-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- Bestehende Nutzer behalten ihre bisherigen (Admin-)Fähigkeiten – kein Lockout.
UPDATE "User" SET "role" = 'admin';
