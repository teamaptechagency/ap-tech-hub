CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FEEDBACK',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pageUrl" TEXT,
    "screenshotUrl" TEXT,
    "reporterId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_reporterId_idx" ON "SupportTicket"("reporterId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_type_idx" ON "SupportTicket"("type");
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
