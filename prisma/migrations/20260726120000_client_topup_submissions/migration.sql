-- A payment submission can now be a balance top-up, which has no invoice
-- behind it, as well as a payment against an invoice.
ALTER TABLE "PaymentSubmission"
  ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'INVOICE';

ALTER TABLE "PaymentSubmission" ALTER COLUMN "invoiceId" DROP NOT NULL;

-- Reviewer's decision, so a rejected client can be told why.
ALTER TABLE "PaymentSubmission"
  ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
ALTER TABLE "PaymentSubmission"
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "PaymentSubmission"
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
