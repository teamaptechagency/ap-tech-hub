CREATE TABLE "WorkDevice" (
  "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "employee" TEXT NOT NULL,
  "pcName" TEXT, "tokenHash" TEXT NOT NULL, "revoked" BOOLEAN NOT NULL DEFAULT false,
  "lastSeenAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'OFFLINE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "WorkDevice_tokenHash_key" ON "WorkDevice"("tokenHash");
CREATE TABLE "WorkDeviceEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "deviceId" TEXT NOT NULL,
  "source" TEXT NOT NULL, "type" TEXT NOT NULL, "platform" TEXT NOT NULL,
  "clicks" INTEGER NOT NULL DEFAULT 0, "keys" INTEGER NOT NULL DEFAULT 0,
  "idleSeconds" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkDeviceEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "WorkDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WorkDeviceEvent_deviceId_createdAt_idx" ON "WorkDeviceEvent"("deviceId", "createdAt");
