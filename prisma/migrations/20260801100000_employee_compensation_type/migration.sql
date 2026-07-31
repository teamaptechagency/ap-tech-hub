-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('PER_JOB', 'MONTHLY_SALARY');

-- AlterTable
-- Defaults to PER_JOB, so existing employees keep today's behavior untouched.
ALTER TABLE "User" ADD COLUMN     "compensationType" "CompensationType" NOT NULL DEFAULT 'PER_JOB',
ADD COLUMN     "monthlySalaryAmount" DECIMAL(12,2);
