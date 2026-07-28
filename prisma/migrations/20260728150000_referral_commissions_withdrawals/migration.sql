CREATE TABLE IF NOT EXISTS "ReferralCommission" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "referralId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "basis" TEXT NOT NULL DEFAULT 'RECEIVED',
  "basisAmount" DECIMAL(12,2) NOT NULL,
  "commissionPercent" DECIMAL(5,2) NOT NULL,
  "clientDiscountPercent" DECIMAL(5,2),
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "reason" TEXT,
  "source" TEXT NOT NULL DEFAULT 'PAYMENT_APPROVAL',
  "sourceRef" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralWithdrawal" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "method" TEXT NOT NULL,
  "accountInfo" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "reference" TEXT,
  "processedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReferralCommission_partnerId_idx" ON "ReferralCommission"("partnerId");
CREATE INDEX IF NOT EXISTS "ReferralCommission_referralId_idx" ON "ReferralCommission"("referralId");
CREATE INDEX IF NOT EXISTS "ReferralCommission_invoiceId_idx" ON "ReferralCommission"("invoiceId");
CREATE INDEX IF NOT EXISTS "ReferralCommission_status_idx" ON "ReferralCommission"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralCommission_referralId_invoiceId_sourceRef_key" ON "ReferralCommission"("referralId", "invoiceId", "sourceRef");

CREATE INDEX IF NOT EXISTS "ReferralWithdrawal_partnerId_idx" ON "ReferralWithdrawal"("partnerId");
CREATE INDEX IF NOT EXISTS "ReferralWithdrawal_status_idx" ON "ReferralWithdrawal"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralCommission_partnerId_fkey') THEN
    ALTER TABLE "ReferralCommission"
      ADD CONSTRAINT "ReferralCommission_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralCommission_referralId_fkey') THEN
    ALTER TABLE "ReferralCommission"
      ADD CONSTRAINT "ReferralCommission_referralId_fkey"
      FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralCommission_invoiceId_fkey') THEN
    ALTER TABLE "ReferralCommission"
      ADD CONSTRAINT "ReferralCommission_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralWithdrawal_partnerId_fkey') THEN
    ALTER TABLE "ReferralWithdrawal"
      ADD CONSTRAINT "ReferralWithdrawal_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
