-- An external project (Fiverr/Upwork/direct) has no Client record, so an
-- invoice must be able to stand on its own with the buyer's details inline.
ALTER TABLE "Invoice" ALTER COLUMN "clientId" DROP NOT NULL;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "externalName" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "externalCountry" TEXT;

-- Earning.invoiceId had no foreign key at all, so deleting an invoice left
-- its earning behind and revenue stayed on the books forever. Add the real
-- constraint with ON DELETE CASCADE.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Earning_invoiceId_fkey'
  ) THEN
    -- Clear any pre-existing rows that point at an invoice which is already
    -- gone, otherwise adding the constraint would fail.
    UPDATE "Earning" e
       SET "invoiceId" = NULL
     WHERE e."invoiceId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "Invoice" i WHERE i."id" = e."invoiceId"
       );

    ALTER TABLE "Earning"
      ADD CONSTRAINT "Earning_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
