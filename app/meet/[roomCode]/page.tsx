import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GuestMeeting } from "@/components/meetings/guest-meeting";

export const dynamic = "force-dynamic";

/**
 * Where a guest link lands. Public on purpose — the point of a guest link is
 * that a client with no account can follow it — but it only opens a meeting
 * that is actually scheduled, and getGuestMeetingUrl re-checks that before
 * handing out a token.
 */
export default async function GuestMeetingPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { roomCode },
    select: { title: true, status: true },
  });

  if (!meeting) notFound();

  if (meeting.status !== "SCHEDULED") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-2 rounded-xl border p-6 text-center">
          <h1 className="text-xl font-bold">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">
            This meeting is not open. Ask the organiser for a new link.
          </p>
        </div>
      </div>
    );
  }

  return <GuestMeeting roomCode={roomCode} meetingTitle={meeting.title} />;
}
