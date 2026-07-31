-- AlterTable
-- Defaults to false: existing posts stay hidden until an author opts in.
ALTER TABLE "BlogPost" ADD COLUMN     "showViewCount" BOOLEAN NOT NULL DEFAULT false;
