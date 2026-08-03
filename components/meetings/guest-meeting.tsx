"use client";

import { useState } from "react";
import { getGuestMeetingUrl } from "@/actions/meeting.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

const WARNING =
  "Do not share personal contact details (phone, email, social media) during meetings. All communication must stay on the platform — violations may end the contract.";

/**
 * The guest side of a meeting.
 *
 * A guest has no account, so the name has to be asked for once here rather
 * than by the video host — that also keeps the conduct warning in front of
 * them before they join, exactly as members see it.
 */
export function GuestMeeting({
  roomCode,
  meetingTitle,
}: {
  roomCode: string;
  meetingTitle: string;
}) {
  const [name, setName] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const result = await getGuestMeetingUrl(roomCode, name).catch(() => ({
      error: "Could not open the meeting room. Please try again.",
    }));

    setBusy(false);
    if ("error" in result) return setError(result.error);
    setRoomUrl(result.url);
  }

  if (roomUrl) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3 p-4">
        <p className="font-semibold">{meetingTitle}</p>
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {WARNING}
        </div>
        <iframe
          src={roomUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="h-[75vh] w-full rounded-lg border"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleJoin}
        className="w-full max-w-md space-y-4 rounded-xl border p-6"
      >
        <div>
          <h1 className="text-xl font-bold">{meetingTitle}</h1>
          <p className="text-sm text-muted-foreground">
            You have been invited to this meeting.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {WARNING}
        </div>

        <div className="space-y-1">
          <Label htmlFor="guest-name">Your name</Label>
          <Input
            id="guest-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="How everyone will see you"
            autoFocus
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Joining…" : "Join meeting"}
        </Button>
      </form>
    </div>
  );
}
