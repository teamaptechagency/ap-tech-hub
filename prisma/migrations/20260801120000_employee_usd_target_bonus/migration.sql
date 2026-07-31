-- AlterTable
-- Both nullable: only meaningful for MONTHLY_SALARY employees, and even
-- then optional (no target set means no bonus tracked).
ALTER TABLE "User" ADD COLUMN     "monthlyTargetUsd" DECIMAL(12,2),
ADD COLUMN     "bonusPerHundredUsd" DECIMAL(12,2);
