-- CreateEnum
CREATE TYPE "BlogVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
-- All additive and nullable (or defaulted), so existing posts are untouched.
ALTER TABLE "BlogPost" ADD COLUMN     "primaryKeyword" TEXT,
ADD COLUMN     "secondaryKeywords" TEXT,
ADD COLUMN     "internalLinks" JSONB,
ADD COLUMN     "visibility" "BlogVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE INDEX "BlogPost_status_visibility_publishedAt_idx" ON "BlogPost"("status", "visibility", "publishedAt");
