"use client";

import { useState } from "react";
import {
  completeMeeting,
  createMeeting,
  processMeeting,
} from "@/actions/meeting.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Copy, Plus, Video, AlertTriangle } from "lucide-react";

export type MeetingRow = {
  id: string;
  title: string;
  scheduledAt: string;
  roomCode: string;
  status: string;
  jobTitle: string | null;
  createdByName: string;
  participants: string[];
};

type Option = { id: string; name: string };

const statusBadge: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  SCHEDULED: "bg-green-100 text-green-700",
  COMPLETED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-red-100 text-red-500",
};

const WARNING =
  "Do not share personal contact details (phone, email, social media) during meetings. All communication must stay on the platform — violations may end the contract.";

export function MeetingsBoard({
  meetings,
  people,
  jobs,
  canCreate,
  isAdmin,
}: {
  meetings: MeetingRow[];
  people: Option[];
  jobs: Option[];
  canCreate: boolean;
  isAdmin: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joining, setJoining] = useState<MeetingRow | null>(null);
  const [inRoom, setInRoom] = useState<MeetingRow | null>(null);

  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function meetingUrl(roomCode: string) {
    return `https://meet.jit.si/APTechHub-${roomCode}`;
  }

  async function copyGuestLink(roomCode: string) {
    await navigator.clipboard?.writeText(meetingUrl(roomCode));
  }

  async function updateMeetingStatus(
    meetingId: string,
    status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
  ) {
    setBusy(true);
    if (status === "COMPLETED") {
      await completeMeeting(meetingId);
    } else {
      await processMeeting(meetingId, status);
    }
    setBusy(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await createMeeting({
      title,
      scheduledAt,
      jobId: jobId ?? undefined,
      participantIds,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setCreateOpen(false);
    setTitle("");
    setScheduledAt("");
    setParticipantIds([]);
  }

  // Jitsi embed room
  if (inRoom) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{inRoom.title}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copyGuestLink(inRoom.roomCode)}>
              <Copy className="mr-2 h-4 w-4" />
              Guest link
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  updateMeetingStatus(inRoom.id, "COMPLETED");
                  setInRoom(null);
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Stop meeting
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setInRoom(null)}>
              Leave meeting
            </Button>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {WARNING}
        </div>
        <iframe
          src={meetingUrl(inRoom.roomCode)}
          allow="camera; microphone; fullscreen; display-capture"
          className="h-[70vh] w-full rounded-lg border"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Video calls run inside the platform (Jitsi)
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New meeting
          </Button>
        )}
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Video className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No meetings scheduled
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {m.title}{" "}
                    <Badge
                      variant="secondary"
                      className={`text-xs ${statusBadge[m.status]}`}
                    >
                      {m.status === "CANCELLED"
                        ? "suspended"
                        : m.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.scheduledAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {m.jobTitle && ` · ${m.jobTitle}`}
                    {` · by ${m.createdByName}`}
                    {` · ${m.participants.join(", ")}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {m.status === "PENDING_APPROVAL" && isAdmin && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateMeetingStatus(m.id, "SCHEDULED")}
                        disabled={busy}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateMeetingStatus(m.id, "CANCELLED")}
                        disabled={busy}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {m.status === "SCHEDULED" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copyGuestLink(m.roomCode)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Guest link
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMeetingStatus(m.id, "CANCELLED")}
                            disabled={busy}
                          >
                            Suspend
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMeetingStatus(m.id, "COMPLETED")}
                            disabled={busy}
                          >
                            Complete
                          </Button>
                        </>
                      )}
                      <Button size="sm" onClick={() => setJoining(m)}>
                        <Video className="mr-2 h-4 w-4" />
                        Join
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pre-join warning dialog */}
      <Dialog
        open={joining !== null}
        onOpenChange={(o) => !o && setJoining(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Before you join
            </DialogTitle>
            <DialogDescription>{WARNING}</DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              setInRoom(joining);
              setJoining(null);
            }}
          >
            I understand — join meeting
          </Button>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New meeting</DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "Scheduled instantly — participants see it in their portal"
                : "Sent to admin for approval before it's scheduled"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mtTitle">Title</Label>
              <Input
                id="mtTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Homepage design review"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mtWhen">Date & time</Label>
                <Input
                  id="mtWhen"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Related job (optional)</Label>
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Participants</Label>
              <div className="flex flex-wrap gap-1.5">
                {people.map((p) => {
                  const on = participantIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setParticipantIds((prev) =>
                          on
                            ? prev.filter((x) => x !== p.id)
                            : [...prev, p.id]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        on
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {p.name}
                      {on && " ✓"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Both sides see this warning: {WARNING}
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Creating..."
                : isAdmin
                  ? "Schedule meeting"
                  : "Request meeting"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
