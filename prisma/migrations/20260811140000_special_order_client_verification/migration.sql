-- The client signs a conversation off before it is scheduled or worked
-- through. Optional per profile, so nothing changes for a profile that has not
-- asked for it — the default is off and existing conversations stay unlocked.
ALTER TABLE "SpecialOrderProfile"
  ADD COLUMN "requireClientVerification" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SpecialOrder" ADD COLUMN "clientVerifiedAt" TIMESTAMP(3);
ALTER TABLE "SpecialOrder" ADD COLUMN "clientVerifiedById" TEXT;

ALTER TABLE "SpecialOrder"
  ADD CONSTRAINT "SpecialOrder_clientVerifiedById_fkey"
  FOREIGN KEY ("clientVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
