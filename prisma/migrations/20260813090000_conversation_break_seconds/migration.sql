-- The gap between messages was whole minutes, which could not express the
-- half-minute pause most conversations want. Same setting, finer unit.
ALTER TABLE "SpecialOrder" ADD COLUMN "conversationBreakSeconds" INTEGER NOT NULL DEFAULT 30;

UPDATE "SpecialOrder"
SET "conversationBreakSeconds" = "conversationBreakMinutes" * 60;

ALTER TABLE "SpecialOrder" DROP COLUMN "conversationBreakMinutes";
