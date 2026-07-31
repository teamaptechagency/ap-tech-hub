-- CreateEnum
CREATE TYPE "BlogEventType" AS ENUM ('IMPRESSION', 'VIEW');

-- CreateTable
CREATE TABLE IF NOT EXISTS "BlogPostEvent" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "type" "BlogEventType" NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'Direct',
  "path" TEXT NOT NULL DEFAULT '/blog',
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogPostEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BlogPostEvent" ADD CONSTRAINT "BlogPostEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "BlogPostEvent_postId_type_createdAt_idx" ON "BlogPostEvent"("postId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "BlogPostEvent_type_createdAt_idx" ON "BlogPostEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "BlogPostEvent_postId_type_source_idx" ON "BlogPostEvent"("postId", "type", "source");
