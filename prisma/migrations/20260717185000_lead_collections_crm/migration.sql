-- Lead collection and follow-up CRM
CREATE TYPE "LeadStatus" AS ENUM (
  'NEW',
  'CONTACTED',
  'FOLLOW_UP',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
  'ARCHIVED'
);

CREATE TYPE "LeadSource" AS ENUM (
  'MANUAL',
  'WEBSITE',
  'IMPORT',
  'FACEBOOK',
  'LINKEDIN',
  'FIVERR',
  'UPWORK',
  'OTHER'
);

CREATE TYPE "LeadActivityType" AS ENUM (
  'NOTE',
  'EMAIL',
  'CALL',
  'FOLLOW_UP',
  'STATUS_CHANGE',
  'IMPORT'
);

CREATE TABLE "LeadCollection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "collectionId" TEXT,
  "name" TEXT NOT NULL,
  "company" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "source" "LeadSource" NOT NULL DEFAULT 'MANUAL',
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "value" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "tags" TEXT,
  "notes" TEXT,
  "nextFollowUpAt" TIMESTAMP(3),
  "lastContactedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadActivity" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "type" "LeadActivityType" NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DONE',
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_collectionId_idx" ON "Lead"("collectionId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");
CREATE INDEX "LeadActivity_type_idx" ON "LeadActivity"("type");
CREATE INDEX "LeadActivity_scheduledAt_idx" ON "LeadActivity"("scheduledAt");

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "LeadCollection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadActivity"
  ADD CONSTRAINT "LeadActivity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
