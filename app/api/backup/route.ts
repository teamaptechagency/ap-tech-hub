import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { NextResponse } from "next/server";

// ============================================
// ONE-CLICK FULL DATABASE BACKUP (admin only)
// Downloads every table as a single JSON file
// ============================================
export async function GET() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  ]);

  const backup = {
    meta: {
      app: "AP Tech Client Hub V2",
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
      action: "BACKUP_DOWNLOADED",
      entity: "System",
    },
  });

  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ap-tech-hub-backup-${date}.json"`,
    },
  });
}