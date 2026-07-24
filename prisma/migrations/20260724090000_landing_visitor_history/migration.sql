CREATE TABLE IF NOT EXISTS "LandingVisitorEvent" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL DEFAULT '/',
  "country" TEXT NOT NULL DEFAULT 'Unknown',
  "city" TEXT,
  "region" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandingVisitorEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LandingVisitorEvent_createdAt_idx" ON "LandingVisitorEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "LandingVisitorEvent_country_idx" ON "LandingVisitorEvent"("country");
CREATE INDEX IF NOT EXISTS "LandingVisitorEvent_country_createdAt_idx" ON "LandingVisitorEvent"("country", "createdAt");
