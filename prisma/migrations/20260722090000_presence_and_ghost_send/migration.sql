ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "presenceBusy" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "displaySenderId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Message_displaySenderId_fkey'
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_displaySenderId_fkey"
      FOREIGN KEY ("displaySenderId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
