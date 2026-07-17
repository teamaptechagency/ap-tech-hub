import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

// ============================================
// ONE-CLICK FULL DATABASE BACKUP (admin only)
// Downloads every table as a single JSON file
// ============================================
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backupType =
    request.nextUrl.searchParams.get("type") === "rollback"
      ? "ROLLBACK_POINT"
      : "FULL_BACKUP";

  const [
    users,
    skills,
    clients,
    jobs,
    jobMembers,
    weeks,
    tasks,
    commonTasks,
    milestones,
    workSessions,
    applications,
    conversations,
    participants,
    messages,
    invoices,
    invoiceItems,
    paymentMethods,
    clientTxns,
    pointTxns,
    pointExchanges,
    workerTxns,
    withdrawRequests,
    earnings,
    expenses,
    exchangeRates,
    settings,
    jobRequests,
    meetings,
    meetingParticipants,
    ratings,
    extensionRequests,
    notifications,
    auditLogs,
    versionSetting,
    retentionSetting,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.skill.findMany(),
    prisma.client.findMany(),
    prisma.job.findMany(),
    prisma.jobMember.findMany(),
    prisma.week.findMany(),
    prisma.weeklyTask.findMany(),
    prisma.commonTask.findMany(),
    prisma.milestone.findMany(),
    prisma.workSession.findMany(),
    prisma.application.findMany(),
    prisma.conversation.findMany(),
    prisma.conversationParticipant.findMany(),
    prisma.message.findMany(),
    prisma.invoice.findMany(),
    prisma.invoiceItem.findMany(),
    prisma.paymentMethod.findMany(),
    prisma.clientTxn.findMany(),
    prisma.pointTxn.findMany(),
    prisma.pointExchangeRequest.findMany(),
    prisma.workerTxn.findMany(),
    prisma.withdrawRequest.findMany(),
    prisma.earning.findMany(),
    prisma.expense.findMany(),
    prisma.exchangeRate.findMany(),
    prisma.setting.findMany(),
    prisma.jobRequest.findMany(),
    prisma.meeting.findMany(),
    prisma.meetingParticipant.findMany(),
    prisma.rating.findMany(),
    prisma.extensionRequest.findMany(),
    prisma.notification.findMany(),
    prisma.auditLog.findMany(),
    prisma.setting.findUnique({ where: { key: "system.version" } }),
    prisma.setting.findUnique({
      where: { key: "system.rollbackRetentionMonths" },
    }),
  ]);

  const backup = {
    meta: {
      app: "AP Tech Client Hub V2",
      type: backupType,
      systemVersion: versionSetting?.value ?? "1.0.0",
      rollbackRetentionMonths: retentionSetting?.value ?? "2",
      createdAt: new Date().toISOString(),
      createdBy: session.user.email,
    },
    data: {
      users,
      skills,
      clients,
      jobs,
      jobMembers,
      weeks,
      tasks,
      commonTasks,
      milestones,
      workSessions,
      applications,
      conversations,
      participants,
      messages,
      invoices,
      invoiceItems,
      paymentMethods,
      clientTxns,
      pointTxns,
      pointExchanges,
      workerTxns,
      withdrawRequests,
      earnings,
      expenses,
      exchangeRates,
      settings,
      jobRequests,
      meetings,
      meetingParticipants,
      ratings,
      extensionRequests,
      notifications,
      auditLogs,
    },
  };

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action:
        backupType === "ROLLBACK_POINT"
          ? "ROLLBACK_POINT_DOWNLOADED"
          : "BACKUP_DOWNLOADED",
      entity: "System",
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  const prefix =
    backupType === "ROLLBACK_POINT"
      ? "ap-tech-hub-rollback-point"
      : "ap-tech-hub-backup";

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${prefix}-${date}.json"`,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Upload a backup JSON file" },
      { status: 400 }
    );
  }

  if (!file.name.toLowerCase().endsWith(".json")) {
    return NextResponse.json(
      { error: "Backup file must be JSON" },
      { status: 400 }
    );
  }

  const text = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON backup file" },
      { status: 400 }
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("data" in parsed) ||
    !parsed.data ||
    typeof parsed.data !== "object"
  ) {
    return NextResponse.json(
      { error: "This does not look like an AP Tech Hub backup" },
      { status: 400 }
    );
  }

  const data = parsed.data as Record<string, unknown>;
  const counts = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.length : 0,
    ])
  );

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "BACKUP_UPLOAD_VALIDATED",
      entity: "System",
      meta: file.name,
    },
  });

  return NextResponse.json({
    success: true,
    fileName: file.name,
    counts,
    message:
      "Backup file is valid. Restore is not applied automatically to protect existing data.",
  });
}
