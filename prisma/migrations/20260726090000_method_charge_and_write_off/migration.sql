-- Payment-method surcharge (bKash cash-out fee etc.), stored on the invoice
-- so a later Settings change never rewrites an invoice already issued.
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "methodChargePercent" DECIMAL(5,2);
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "methodChargeLabel" TEXT;

-- Shortfall the admin chose to absorb when settling a short payment.
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "writtenOffAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "writtenOffNote" TEXT;
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "writtenOffAt" TIMESTAMP(3);
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "writtenOffById" TEXT;
