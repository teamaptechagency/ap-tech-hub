ALTER TABLE "WorkDevice" ADD COLUMN "lastWindowsAt" TIMESTAMP(3), ADD COLUMN "lastBrowserAt" TIMESTAMP(3), ADD COLUMN "appVersion" TEXT, ADD COLUMN "extensionVersion" TEXT;
CREATE TABLE "DeviceEmployee" (
  "id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expectedStart" TEXT NOT NULL DEFAULT '07:00', "graceMinutes" INTEGER NOT NULL DEFAULT 10, "shiftLabel" TEXT NOT NULL DEFAULT 'MORNING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DeviceEmployee_code_key" ON "DeviceEmployee"("code");
CREATE TABLE "DeviceShift" (
  "id" TEXT NOT NULL PRIMARY KEY, "employeeId" TEXT NOT NULL, "deviceId" TEXT, "deviceName" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL, "openEmployeeKey" TEXT, "openDeviceKey" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "scheduledStartAt" TIMESTAMP(3) NOT NULL, "scheduledEndAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3), "breakStartedAt" TIMESTAMP(3),
  "breakSeconds" INTEGER NOT NULL DEFAULT 0, "lateMinutes" INTEGER NOT NULL DEFAULT 0,
  "task" TEXT NOT NULL DEFAULT '', "handover" TEXT NOT NULL DEFAULT '', "endReason" TEXT, "earlyLeaveReason" TEXT,
  CONSTRAINT "DeviceShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "DeviceEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DeviceShift_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "WorkDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DeviceShift_sessionHash_key" ON "DeviceShift"("sessionHash");
CREATE UNIQUE INDEX "DeviceShift_openEmployeeKey_key" ON "DeviceShift"("openEmployeeKey");
CREATE UNIQUE INDEX "DeviceShift_openDeviceKey_key" ON "DeviceShift"("openDeviceKey");
CREATE INDEX "DeviceShift_startedAt_idx" ON "DeviceShift"("startedAt");
CREATE INDEX "DeviceShift_employeeId_startedAt_idx" ON "DeviceShift"("employeeId", "startedAt");
ALTER TABLE "WorkDeviceEvent" ADD COLUMN "shiftId" TEXT;
ALTER TABLE "WorkDeviceEvent" ALTER COLUMN "deviceId" DROP NOT NULL;
ALTER TABLE "WorkDeviceEvent" DROP CONSTRAINT "WorkDeviceEvent_deviceId_fkey";
ALTER TABLE "WorkDeviceEvent" ADD CONSTRAINT "WorkDeviceEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "WorkDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkDeviceEvent" ADD CONSTRAINT "WorkDeviceEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "DeviceShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "WorkDeviceEvent_shiftId_createdAt_idx" ON "WorkDeviceEvent"("shiftId", "createdAt");
CREATE TABLE "DeviceDailyTemplate" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "shiftLabel" TEXT NOT NULL DEFAULT 'MORNING', "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "primaryEmployeeId" TEXT, "fallbackEmployeeId" TEXT,
  CONSTRAINT "DeviceDailyTemplate_primaryEmployeeId_fkey" FOREIGN KEY ("primaryEmployeeId") REFERENCES "DeviceEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DeviceDailyTemplate_fallbackEmployeeId_fkey" FOREIGN KEY ("fallbackEmployeeId") REFERENCES "DeviceEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "DeviceDailyTask" (
  "id" TEXT NOT NULL PRIMARY KEY, "employeeId" TEXT NOT NULL, "templateId" TEXT NOT NULL, "day" TEXT NOT NULL, "title" TEXT NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false, "completedAt" TIMESTAMP(3), "proofUrl" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'PENDING', "reason" TEXT NOT NULL DEFAULT '', "version" INTEGER NOT NULL DEFAULT 0, "completedByEmployeeId" TEXT, "updatedByEmployeeId" TEXT,
  CONSTRAINT "DeviceDailyTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "DeviceEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DeviceDailyTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DeviceDailyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DeviceDailyTask_completedByEmployeeId_fkey" FOREIGN KEY ("completedByEmployeeId") REFERENCES "DeviceEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DeviceDailyTask_updatedByEmployeeId_fkey" FOREIGN KEY ("updatedByEmployeeId") REFERENCES "DeviceEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DeviceDailyTask_templateId_day_key" ON "DeviceDailyTask"("templateId", "day");
CREATE INDEX "DeviceDailyTask_day_employeeId_idx" ON "DeviceDailyTask"("day", "employeeId");
CREATE TABLE "DeviceDailyTaskChange" (
  "id" TEXT NOT NULL PRIMARY KEY, "taskId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "fromStatus" TEXT NOT NULL, "toStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '', "proofUrl" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceDailyTaskChange_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DeviceDailyTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DeviceDailyTaskChange_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "DeviceEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DeviceDailyTaskChange_taskId_createdAt_idx" ON "DeviceDailyTaskChange"("taskId", "createdAt");
CREATE TABLE "WorkStationGrowthArchive" ("id" TEXT NOT NULL PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reason" TEXT NOT NULL, "snapshot" JSONB NOT NULL);
INSERT INTO "DeviceDailyTemplate" ("id", "title", "sortOrder") VALUES
  ('morning-blog', 'Publish or update the daily blog post', 0),
  ('morning-news', 'Update the news portal', 1),
  ('morning-linkedin', 'Publish the daily LinkedIn update', 2);
