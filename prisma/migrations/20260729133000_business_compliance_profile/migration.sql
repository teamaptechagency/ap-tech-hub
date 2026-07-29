CREATE TYPE "BusinessVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'MASKED', 'DRAFT');
CREATE TYPE "BusinessVerificationStatus" AS ENUM ('VERIFIED', 'PENDING_VERIFICATION', 'NOT_PUBLISHED', 'EXPIRED', 'RENEWAL_REQUIRED');
CREATE TYPE "BusinessEntityType" AS ENUM ('BANGLADESH_SOLE_PROPRIETORSHIP', 'BANGLADESH_PRIVATE_LIMITED_COMPANY', 'UK_LIMITED_COMPANY', 'US_LLC', 'OTHER');
CREATE TYPE "BusinessEntityStatus" AS ENUM ('PLANNED', 'REGISTRATION_IN_PROGRESS', 'ACTIVE', 'DORMANT', 'CLOSED');
CREATE TYPE "ComplianceReminderStatus" AS ENUM ('OPEN', 'DONE', 'SNOOZED', 'CANCELLED');

CREATE TABLE "BusinessProfile" (
  "id" TEXT NOT NULL,
  "legalName" TEXT,
  "tradingName" TEXT NOT NULL DEFAULT 'AP Tech Agency',
  "legalStructure" TEXT,
  "businessType" TEXT NOT NULL DEFAULT 'Digital services, software development, website development, UI/UX design, WordPress development, and technology consulting',
  "country" TEXT NOT NULL DEFAULT 'Bangladesh',
  "address" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "whatsapp" TEXT,
  "website" TEXT,
  "establishedYear" INTEGER,
  "description" TEXT,
  "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'NOT_PUBLISHED',
  "fieldVisibility" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessRegistration" (
  "id" TEXT NOT NULL,
  "businessProfileId" TEXT NOT NULL,
  "registrationType" TEXT NOT NULL,
  "registrationNumber" TEXT,
  "issuingAuthority" TEXT,
  "issueDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'NOT_PUBLISHED',
  "visibility" "BusinessVisibility" NOT NULL DEFAULT 'PRIVATE',
  "documentUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternationalEntity" (
  "id" TEXT NOT NULL,
  "businessProfileId" TEXT NOT NULL,
  "entityName" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "entityType" "BusinessEntityType" NOT NULL,
  "registrationNumber" TEXT,
  "incorporationDate" TIMESTAMP(3),
  "registeredAddress" TEXT,
  "taxReference" TEXT,
  "businessStatus" "BusinessEntityStatus" NOT NULL DEFAULT 'PLANNED',
  "entityPurpose" TEXT,
  "websiteUrl" TEXT,
  "verificationDocumentUrl" TEXT,
  "visibility" "BusinessVisibility" NOT NULL DEFAULT 'PRIVATE',
  "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'NOT_PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternationalEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceReminder" (
  "id" TEXT NOT NULL,
  "businessProfileId" TEXT NOT NULL,
  "entityId" TEXT,
  "reminderType" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "recurrence" TEXT,
  "assignedUserId" TEXT,
  "status" "ComplianceReminderStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessDocument" (
  "id" TEXT NOT NULL,
  "businessProfileId" TEXT NOT NULL,
  "entityId" TEXT,
  "documentType" TEXT NOT NULL,
  "documentName" TEXT NOT NULL,
  "fileUrl" TEXT,
  "visibility" "BusinessVisibility" NOT NULL DEFAULT 'PRIVATE',
  "expiryDate" TIMESTAMP(3),
  "verificationStatus" "BusinessVerificationStatus" NOT NULL DEFAULT 'NOT_PUBLISHED',
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusinessRegistration_businessProfileId_idx" ON "BusinessRegistration"("businessProfileId");
CREATE INDEX "BusinessRegistration_visibility_idx" ON "BusinessRegistration"("visibility");
CREATE INDEX "BusinessRegistration_verificationStatus_idx" ON "BusinessRegistration"("verificationStatus");
CREATE INDEX "InternationalEntity_businessProfileId_idx" ON "InternationalEntity"("businessProfileId");
CREATE INDEX "InternationalEntity_businessStatus_idx" ON "InternationalEntity"("businessStatus");
CREATE INDEX "InternationalEntity_visibility_idx" ON "InternationalEntity"("visibility");
CREATE INDEX "ComplianceReminder_businessProfileId_idx" ON "ComplianceReminder"("businessProfileId");
CREATE INDEX "ComplianceReminder_entityId_idx" ON "ComplianceReminder"("entityId");
CREATE INDEX "ComplianceReminder_dueDate_idx" ON "ComplianceReminder"("dueDate");
CREATE INDEX "ComplianceReminder_status_idx" ON "ComplianceReminder"("status");
CREATE INDEX "BusinessDocument_businessProfileId_idx" ON "BusinessDocument"("businessProfileId");
CREATE INDEX "BusinessDocument_entityId_idx" ON "BusinessDocument"("entityId");
CREATE INDEX "BusinessDocument_visibility_idx" ON "BusinessDocument"("visibility");

ALTER TABLE "BusinessRegistration" ADD CONSTRAINT "BusinessRegistration_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternationalEntity" ADD CONSTRAINT "InternationalEntity_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceReminder" ADD CONSTRAINT "ComplianceReminder_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceReminder" ADD CONSTRAINT "ComplianceReminder_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "InternationalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "InternationalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
