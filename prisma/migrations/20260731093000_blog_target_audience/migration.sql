-- AlterTable
-- Nullable, so existing posts are untouched.
ALTER TABLE "BlogPost" ADD COLUMN     "targetAudience" TEXT;
