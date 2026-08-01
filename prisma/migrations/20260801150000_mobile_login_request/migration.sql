-- CreateTable
CREATE TABLE "MobileLoginRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "approvalToken" TEXT,
    "approvalTokenExp" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileLoginRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileLoginRequest_approvalToken_key" ON "MobileLoginRequest"("approvalToken");

-- CreateIndex
CREATE INDEX "MobileLoginRequest_userId_idx" ON "MobileLoginRequest"("userId");

-- AddForeignKey
ALTER TABLE "MobileLoginRequest" ADD CONSTRAINT "MobileLoginRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
