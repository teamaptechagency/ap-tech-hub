-- CreateTable
CREATE TABLE "GrowthMonth" (
    "id" TEXT NOT NULL,
    "monthNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT,
    "mainGoal" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthMonthlyTask" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "assigneeId" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthMonthlyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthWeeklyTemplate" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthWeeklyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrowthMonth_monthNumber_key" ON "GrowthMonth"("monthNumber");

-- AlterTable
ALTER TABLE "GrowthWeek" ADD COLUMN     "monthId" TEXT;

-- AddForeignKey
ALTER TABLE "GrowthMonthlyTask" ADD CONSTRAINT "GrowthMonthlyTask_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "GrowthMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMonthlyTask" ADD CONSTRAINT "GrowthMonthlyTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMonthlyTask" ADD CONSTRAINT "GrowthMonthlyTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthWeeklyTemplate" ADD CONSTRAINT "GrowthWeeklyTemplate_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "GrowthMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthWeek" ADD CONSTRAINT "GrowthWeek_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "GrowthMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
