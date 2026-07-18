CREATE TABLE "LoginSecurityRecord" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "email" TEXT,
  "ipAddress" TEXT NOT NULL,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "holdLevel" INTEGER NOT NULL DEFAULT 0,
  "holdUntil" TIMESTAMP(3),
  "hardBlocked" BOOLEAN NOT NULL DEFAULT false,
  "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoginSecurityRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IpBlock" (
  "id" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "blockedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
  "blockedUntil" TIMESTAMP(3),
  "unlockedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IpBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoginHelpRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "ipAddress" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoginHelpRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserLoginPin" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserLoginPin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserLoginDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceToken" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "country" TEXT,
  "city" TEXT,
  "region" TEXT,
  "trusted" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserLoginDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginSecurityRecord_key_key" ON "LoginSecurityRecord"("key");
CREATE INDEX "LoginSecurityRecord_email_idx" ON "LoginSecurityRecord"("email");
CREATE INDEX "LoginSecurityRecord_ipAddress_idx" ON "LoginSecurityRecord"("ipAddress");
CREATE INDEX "LoginSecurityRecord_holdUntil_idx" ON "LoginSecurityRecord"("holdUntil");
CREATE INDEX "LoginSecurityRecord_hardBlocked_idx" ON "LoginSecurityRecord"("hardBlocked");

CREATE UNIQUE INDEX "IpBlock_ipAddress_key" ON "IpBlock"("ipAddress");
CREATE INDEX "IpBlock_active_idx" ON "IpBlock"("active");
CREATE INDEX "IpBlock_blockedUntil_idx" ON "IpBlock"("blockedUntil");

CREATE INDEX "LoginHelpRequest_email_idx" ON "LoginHelpRequest"("email");
CREATE INDEX "LoginHelpRequest_status_idx" ON "LoginHelpRequest"("status");

CREATE UNIQUE INDEX "UserLoginPin_userId_key" ON "UserLoginPin"("userId");
CREATE INDEX "UserLoginPin_userId_idx" ON "UserLoginPin"("userId");

CREATE UNIQUE INDEX "UserLoginDevice_deviceToken_key" ON "UserLoginDevice"("deviceToken");
CREATE INDEX "UserLoginDevice_userId_idx" ON "UserLoginDevice"("userId");
CREATE INDEX "UserLoginDevice_lastSeenAt_idx" ON "UserLoginDevice"("lastSeenAt");
CREATE INDEX "UserLoginDevice_trusted_idx" ON "UserLoginDevice"("trusted");
