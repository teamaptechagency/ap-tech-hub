-- Advance/purchase invoice: the client funds project costs up front, so the
-- payment credits their balance instead of being booked as agency earnings.
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "creditsClientBalance" BOOLEAN NOT NULL DEFAULT false;

-- Purchase tracking per line item. Ticking one bought draws its cost down
-- from the client's balance.
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS "purchased" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS "purchasedAt" TIMESTAMP(3);
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS "purchasedById" TEXT;
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS "purchaseNote" TEXT;
