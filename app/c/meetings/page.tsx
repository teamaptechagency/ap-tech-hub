import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MeetingsBoard, type MeetingRow } from "@/components/meetings/meetings-board";

export default async function ClientMeetingsPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const meetings = await prisma.meeting.findMany({
    where: {
      status: { in: ["SCHEDULED", "COMPLETED"] },
      participants: { some: { userId: session.user.id } },
    },
    orderBy: { scheduledAt: "desc" },
    include: {
      job: { select: { title: true } },
      createdBy: { select: { name: true } },
      participants: { include: { user: { select: { name: true } } } },
    },
  });

  const rows: MeetingRow[] = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    scheduledAt: m.scheduledAt.toISOString(),
    roomCode: m.roomCode,
    status: m.status,
    jobTitle: m.job?.title ?? null,
    createdByName: m.createdBy.name,
    participants: m.participants.map((p) => p.user.name),
  }));

  return (
    <MeetingsBoard
      meetings={rows}
      people={[]}
      jobs={[]}
      canCreate={false}
      isAdmin={false}
    />
  );
}