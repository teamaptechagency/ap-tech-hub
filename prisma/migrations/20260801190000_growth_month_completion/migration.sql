-- AlterTable
ALTER TABLE "GrowthMonth" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" TEXT;

-- AddForeignKey
ALTER TABLE "GrowthMonth" ADD CONSTRAINT "GrowthMonth_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
