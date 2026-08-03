import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MeetingsBoard, type MeetingRow } from "@/components/meetings/meetings-board";

export default async function EmployeeMeetingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [meetings, people, jobs] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          { participants: { some: { userId: session.user.id } } },
        ],
      },
      orderBy: { scheduledAt: "desc" },
      include: {
        job: { select: { title: true } },
        createdBy: { select: { name: true } },
        participants: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { id: { not: session.user.id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.job.findMany({
      where: {
        members: { some: { userId: session.user.id } },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: { id: true, title: true },
    }),
  ]);

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
      people={people}
      jobs={jobs.map((j) => ({ id: j.id, name: j.title }))}
      canCreate={true}
      isAdmin={false}
    />
  );
}