-- Buyers kept as their own records rather than as free text retyped on every
-- conversation. A partner can add the people they deal with before any order
-- exists, and "has this person bought before" becomes a lookup instead of a
-- guess at whether two spellings are the same person.
CREATE TABLE "SpecialOrderBuyer" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT,
    "profileId" TEXT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "country" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialOrderBuyer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SpecialOrderBuyer_profileId_idx" ON "SpecialOrderBuyer"("profileId");
CREATE INDEX "SpecialOrderBuyer_marketplaceId_idx" ON "SpecialOrderBuyer"("marketplaceId");
-- Deliberately not unique: a duplicate already in the data would fail the
-- migration, so the "this handle is already taken" rule is enforced in code.
CREATE INDEX "SpecialOrderBuyer_username_idx" ON "SpecialOrderBuyer"("username");

ALTER TABLE "SpecialOrderBuyer"
  ADD CONSTRAINT "SpecialOrderBuyer_marketplaceId_fkey"
  FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SpecialOrderBuyer"
  ADD CONSTRAINT "SpecialOrderBuyer_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "SpecialOrderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SpecialOrderBuyer"
  ADD CONSTRAINT "SpecialOrderBuyer_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The handle stays on the conversation as well as on the buyer record, so a
-- conversation from before this table still says who it was with.
ALTER TABLE "SpecialOrder" ADD COLUMN "buyerUsername" TEXT;
ALTER TABLE "SpecialOrder" ADD COLUMN "buyerId" TEXT;

CREATE INDEX "SpecialOrder_buyerId_idx" ON "SpecialOrder"("buyerId");

ALTER TABLE "SpecialOrder"
  ADD CONSTRAINT "SpecialOrder_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "SpecialOrderBuyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
