"use client";

import { useState } from "react";
import { processRegistration } from "@/actions/register.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, FileText } from "lucide-react";
import { fileViewUrl } from "@/lib/file-url";

export type PendingUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  companyName: string | null;
  profession: string | null;
  gender: string | null;
  skills: string[];
  nidUrl: string | null;
  photoUrl: string | null;
  createdAt: string;
};

export function PendingApprovals({ users }: { users: PendingUser[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (users.length === 0) return null;

  async function handle(userId: string, action: "APPROVE" | "REJECT") {
    setBusyId(userId);
    await processRegistration(userId, action);
    setBusyId(null);
  }

  return (
    <Card className="border-amber-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-4 w-4 text-amber-600" />
          Pending registrations ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0 px-4 pb-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-start justify-between gap-3 py-3"
          >
            <div className="flex min-w-0 gap-3">
              {u.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={fileViewUrl(u.photoUrl)}
                  alt={u.name}
                  className="h-12 w-12 cursor-pointer rounded-full object-cover"
                  onClick={() => window.open(fileViewUrl(u.photoUrl), "_blank")}
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {u.name}{" "}
                  <Badge variant="secondary" className="text-[10px]">
                    {u.companyName ? "client" : "worker"}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ""}
                  {u.companyName ? ` · ${u.companyName}` : ""}
                  {u.profession ? ` · ${u.profession}` : ""}
                  {u.gender ? ` · ${u.gender.toLowerCase()}` : ""}
                </p>
                {u.skills.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Skills: {u.skills.join(", ")}
                  </p>
                ) : null}
                {u.nidUrl ? (
                  <button
                    type="button"
                    onClick={() => window.open(fileViewUrl(u.nidUrl), "_blank")}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <FileText className="h-3 w-3" />
                    View NID/Passport
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                disabled={busyId === u.id}
                onClick={() => handle(u.id, "APPROVE")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === u.id}
                onClick={() => handle(u.id, "REJECT")}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}