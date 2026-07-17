"use client";

import { useState } from "react";
import { reviewProfileChange } from "@/actions/profile.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type RequestRow = {
  id: string;
  type: string;
  oldValue: string | null;
  newValue: string;
  status: string;
  createdAt: string;
  withdrawBlockedUntil: string;
  user: { name: string; email: string; role: string };
};

export function ProfileChangeReview({ requests }: { requests: RequestRow[] }) {
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");

  async function submit(id: string, action: "APPROVED" | "REJECTED") {
    setBusyId(id);
    const result = await reviewProfileChange(id, action, note);
    setBusyId("");
    if (result.error) return toast.error(result.error);
    setNote("");
    toast.success(action === "APPROVED" ? "Change approved" : "Change rejected");
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No profile changes pending review
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {request.user.name} - {request.type.toLowerCase()} change
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.user.email} / {request.user.role.toLowerCase()} /
                  requested {new Date(request.createdAt).toLocaleString("en-GB")}
                </p>
                <p className="text-xs text-amber-600">
                  Verification wait until{" "}
                  {new Date(request.withdrawBlockedUntil).toLocaleString("en-GB")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ValueBox label="Current" value={formatValue(request.oldValue)} />
              <ValueBox label="Requested" value={formatValue(request.newValue)} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Review note (optional)"
                className="min-w-48 flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => submit(request.id, "APPROVED")}
                disabled={busyId === request.id}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => submit(request.id, "REJECTED")}
                disabled={busyId === request.id}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">
        {value || "Not added"}
      </p>
    </div>
  );
}

function formatValue(value: string | null) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as { method?: string; details?: string };
    if (parsed && typeof parsed === "object") {
      return `Method: ${parsed.method || "Not added"}\nDetails: ${
        parsed.details || "Not added"
      }`;
    }
  } catch {
    // Plain values are displayed directly.
  }
  return value;
}
