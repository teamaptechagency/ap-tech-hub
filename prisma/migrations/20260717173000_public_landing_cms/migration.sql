-- Public landing page CMS
CREATE TABLE "LandingHeroSlide" (
  "id" TEXT NOT NULL,
  "badge" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "imageUrl" TEXT,
  "primaryLabel" TEXT,
  "primaryTarget" TEXT,
  "secondaryLabel" TEXT,
  "secondaryTarget" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingHeroSlide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingServiceCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingServiceCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingService" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "details" TEXT,
  "icon" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingProject" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT NOT NULL,
  "details" TEXT,
  "imageUrl" TEXT,
  "projectUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingTeamMember" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "bio" TEXT,
  "photoUrl" TEXT,
  "skills" JSONB,
  "socialLinks" JSONB,
  "jobs" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingReview" (
  "id" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "clientRole" TEXT,
  "company" TEXT,
  "avatarUrl" TEXT,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "quote" TEXT NOT NULL,
  "details" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingPageContent" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingPageContent_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "LandingContactMessage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandingContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingChatLead" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingChatLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingChatMessage" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "sender" TEXT NOT NULL DEFAULT 'GUEST',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandingChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LandingServiceCategory_slug_key" ON "LandingServiceCategory"("slug");

CREATE INDEX "LandingService_categoryId_idx" ON "LandingService"("categoryId");
CREATE INDEX "LandingChatMessage_leadId_idx" ON "LandingChatMessage"("leadId");

ALTER TABLE "LandingService"
  ADD CONSTRAINT "LandingService_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "LandingServiceCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LandingChatMessage"
  ADD CONSTRAINT "LandingChatMessage_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "LandingChatLead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
