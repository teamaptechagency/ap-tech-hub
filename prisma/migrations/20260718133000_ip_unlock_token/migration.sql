ALTER TABLE "IpBlock"
  ADD COLUMN IF NOT EXISTS "unlockToken" TEXT,
  ADD COLUMN IF NOT EXISTS "unlockTokenExp" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "IpBlock_unlockToken_key" ON "IpBlock"("unlockToken");
CREATE INDEX IF NOT EXISTS "IpBlock_unlockToken_idx" ON "IpBlock"("unlockToken");
