-- Whether a conversation is with a buyer who has ordered before or one who is
-- new. Repeat business is worth knowing about on its own: it says the delivery
-- was good enough to come back for, and it is the cheapest work to win.
--
-- Nullable, because every conversation already on record predates the column
-- and nobody can say retrospectively which of the two it was. Left unset, the
-- app works it out from the buyer name where it can.
ALTER TABLE "SpecialOrder" ADD COLUMN "buyerKind" TEXT;
