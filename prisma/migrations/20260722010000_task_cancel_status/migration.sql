ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "WeeklyTask"
  ADD COLUMN IF NOT EXISTS "cancelReason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledById" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyTask_cancelledById_fkey'
  ) THEN
    ALTER TABLE "WeeklyTask"
      ADD CONSTRAINT "WeeklyTask_cancelledById_fkey"
      FOREIGN KEY ("cancelledById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
