-- Referral/business partner: brings clients in. Deliberately a separate role
-- from BUSINESS_PARTNER (Special Order delivery work), which it must never
-- be able to reach.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REFERRAL_PARTNER';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferralApplicationStatus') THEN
    CREATE TYPE "ReferralApplicationStatus" AS ENUM (
      'SUBMITTED', 'UNDER_REVIEW', 'CONTACTED', 'INFO_REQUIRED',
      'APPROVED', 'REJECTED', 'CLOSED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferralStatus') THEN
    CREATE TYPE "ReferralStatus" AS ENUM (
      'PENDING', 'VERIFIED', 'APPROVED', 'REJECTED',
      'DUPLICATE', 'INVALID', 'EXPIRED', 'CANCELLED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ReferralPartner" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "displayName" TEXT,
  "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
  "clientDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
  "commissionBasis" TEXT NOT NULL DEFAULT 'RECEIVED',
  "mode" TEXT NOT NULL DEFAULT 'REFERRAL',
  "brandingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "brandingStatement" TEXT,
  "agreementNote" TEXT,
  "agreementUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralPartner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralPartner_userId_key" ON "ReferralPartner"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralPartner_code_key" ON "ReferralPartner"("code");
CREATE INDEX IF NOT EXISTS "ReferralPartner_status_idx" ON "ReferralPartner"("status");

CREATE TABLE IF NOT EXISTS "ReferralPartnerApplication" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "businessName" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "country" TEXT,
  "website" TEXT,
  "socialProfile" TEXT,
  "businessType" TEXT,
  "servicesOffered" TEXT,
  "industries" TEXT,
  "expectedClientType" TEXT,
  "expectedReferrals" TEXT,
  "preferredContact" TEXT,
  "note" TEXT,
  "status" "ReferralApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "adminNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "partnerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralPartnerApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralPartnerApplication_partnerId_key" ON "ReferralPartnerApplication"("partnerId");
CREATE INDEX IF NOT EXISTS "ReferralPartnerApplication_status_idx" ON "ReferralPartnerApplication"("status");
CREATE INDEX IF NOT EXISTS "ReferralPartnerApplication_email_idx" ON "ReferralPartnerApplication"("email");

CREATE TABLE IF NOT EXISTS "Referral" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "clientId" TEXT,
  "leadEmail" TEXT,
  "leadName" TEXT,
  "code" TEXT NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "clientDiscountPercent" DECIMAL(5,2),
  "commissionPercent" DECIMAL(5,2),
  "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "registeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Referral_partnerId_clientId_key" ON "Referral"("partnerId", "clientId");
CREATE INDEX IF NOT EXISTS "Referral_status_idx" ON "Referral"("status");
CREATE INDEX IF NOT EXISTS "Referral_code_idx" ON "Referral"("code");
CREATE INDEX IF NOT EXISTS "Referral_leadEmail_idx" ON "Referral"("leadEmail");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralPartner_userId_fkey') THEN
    ALTER TABLE "ReferralPartner"
      ADD CONSTRAINT "ReferralPartner_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralPartnerApplication_partnerId_fkey') THEN
    ALTER TABLE "ReferralPartnerApplication"
      ADD CONSTRAINT "ReferralPartnerApplication_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_partnerId_fkey') THEN
    ALTER TABLE "Referral"
      ADD CONSTRAINT "Referral_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_clientId_fkey') THEN
    ALTER TABLE "Referral"
      ADD CONSTRAINT "Referral_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
