"use client";

import { useEffect, useState } from "react";
import { startTimer, stopTimer, deleteSession } from "@/actions/session.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Square, Trash2, Lock } from "lucide-react";

export type SessionRow = {
  id: string;
  userName: string;
  startedAt: string; // ISO
  endedAt: string | null;
  duration: number | null;
  note: string | null;
};

function fmtDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerSection({
  jobId,
  sessions,
  myRunningStart, // ISO string if my timer is running
  myWeekHours,
  weeklyLimit,
  totalHours,
  isManager,
  amMember,
}: {
  jobId: string;
  sessions: SessionRow[];
  myRunningStart: string | null;
  myWeekHours: number;
  weeklyLimit: number | null;
  totalHours: number;
  isManager: boolean;
  amMember: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const [stopOpen, setStopOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Live tick while running
  useEffect(() => {
    if (!myRunningStart) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [myRunningStart]);

  const runningSeconds = myRunningStart
    ? Math.max(0, Math.floor((now - new Date(myRunningStart).getTime()) / 1000))
    : 0;

  const limitReached =
    weeklyLimit !== null && myWeekHours >= weeklyLimit && !myRunningStart;

  const weekPercent =
    weeklyLimit !== null
      ? Math.min(100, Math.round((myWeekHours / weeklyLimit) * 100))
      : 0;

  async function handleStart() {
    setError("");
    setBusy(true);
    const result = await startTimer(jobId);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  async function handleStop(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const result = await stopTimer(jobId, note);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNote("");
    setStopOpen(false);
  }

  const canUseTimer = amMember || isManager;

  return (
    <div className="space-y-4">
      {/* Timer card */}
      {canUseTimer && (
        <Card className={myRunningStart ? "border-2 border-primary" : ""}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-mono text-3xl font-bold">
                {fmtDuration(runningSeconds)}
              </p>
              <p className="text-xs text-muted-foreground">
                {myRunningStart
                  ? "Timer running — stop when you finish this session"
                  : "Timer stopped"}
              </p>
            </div>
            {myRunningStart ? (
              <Button
                onClick={() => setStopOpen(true)}
                variant="destructive"
                disabled={busy}
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button onClick={handleStart} disabled={busy || limitReached}>
                {limitReached ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Limit reached
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start timer
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">
              My hours this week
            </p>
            <p className="text-xl font-bold">
              {myWeekHours.toFixed(1)}h
              {weeklyLimit !== null && (
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  / {weeklyLimit}h limit
                </span>
              )}
            </p>
            {weeklyLimit !== null && (
              <Progress value={weekPercent} className="mt-2 h-1.5" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">
              Total logged (all members)
            </p>
            <p className="text-xl font-bold">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
      </div>

      {/* Session log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Session log</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {sessions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sessions yet — start the timer to log work
            </p>
          )}
          {sessions.map((s) => (
            <div key={s.id} className="group flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {s.userName}
                  {s.endedAt === null && (
                    <span className="ml-2 text-xs font-normal text-primary">
                      ● running
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.startedAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {s.note && ` · ${s.note}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-sm">
                  {s.duration !== null ? fmtDuration(s.duration) : "—"}
                </span>
                {isManager && (
                  <button
                    onClick={() => deleteSession(s.id, jobId)}
                    className="invisible text-muted-foreground hover:text-red-500 group-hover:visible"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stop dialog — session note */}
      <Dialog open={stopOpen} onOpenChange={setStopOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop timer</DialogTitle>
            <DialogDescription>
              What did you work on? (shown in the session log — attach Traqq
              report in the coming work-proof step)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStop} className="space-y-4">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Product page bug fixes"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Stopping..." : `Stop — ${fmtDuration(runningSeconds)}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}