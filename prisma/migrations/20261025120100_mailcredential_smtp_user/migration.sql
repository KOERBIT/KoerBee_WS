-- Separate SMTP-Absenderdaten für Quittungen (Commit a119860).
-- IF NOT EXISTS: die Spalten wurden evtl. schon manuell in Prod angelegt.
ALTER TABLE "MailCredential" ADD COLUMN IF NOT EXISTS "smtpUser" TEXT;
ALTER TABLE "MailCredential" ADD COLUMN IF NOT EXISTS "smtpPassword" TEXT;
