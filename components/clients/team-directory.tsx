"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getOrCreateDirect } from "@/actions/message.actions";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Users } from "lucide-react";
import {
  presenceColor,
  presenceDotClass,
  presenceLabel,
} from "@/lib/presence";

type Member = {
  id: string;
  name: string;
  profession: string | null;
  imageUrl: string | null;
  accountStatus: string;
  lastActiveAt: string | null;
  presenceBusy: boolean;
};

export function TeamDirectory({ members }: { members: Member[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function startChat(member: Member) {
    if (busyId) return;
    setBusyId(member.id);
    const result = await getOrCreateDirect(member.id);
    setBusyId(null);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    if ("conversationId" in result && result.conversationId) {
      router.push(`/c/messages?open=${result.conversationId}`);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" />
          Our Team
        </h1>
        <p className="text-sm text-muted-foreground">
          Message any team member directly. Their status shows if they&apos;re
          available right now.
        </p>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No team members to show yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const color = presenceColor(member);
            return (
              <Card key={member.id}>
                <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                  <div className="relative">
                    <UserAvatar
                      name={member.name}
                      imageUrl={member.imageUrl}
                      fallback="TM"
                      className="h-16 w-16 text-base"
                    />
                    <span
                      title={presenceLabel[color]}
                      className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background ${presenceDotClass[color]}`}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Team member
                      {member.profession ? ` · ${member.profession}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                      {presenceLabel[color]}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    disabled={busyId === member.id}
                    onClick={() => startChat(member)}
                  >
                    <MessageCircle className="mr-2 h-3.5 w-3.5" />
                    {busyId === member.id ? "Opening..." : "Message"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
