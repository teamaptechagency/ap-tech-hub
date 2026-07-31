-- AlterTable
-- Nullable: existing items and every invoice flow that doesn't track cost stay untouched.
ALTER TABLE "InvoiceItem" ADD COLUMN     "costUsd" DECIMAL(12,2);
