"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { UserAvatar } from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Search } from "lucide-react";
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
  skills: string[];
};

export function TeamDirectory({ members }: { members: Member[] }) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Search className="h-6 w-6" />
          Find Expert
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse our team by role and skills. Direct employee contact opens only
          after your project is created and assigned by AP Tech.
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

                  <div className="min-w-0 w-full">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Team member
                      {member.profession ? ` · ${member.profession}` : ""}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {presenceLabel[color]}
                    </p>
                    {member.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {member.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      toast.info("Request a project first. Assigned team chat opens inside the job.");
                      router.push("/c/request");
                    }}
                  >
                    <Briefcase className="mr-2 h-3.5 w-3.5" />
                    Request project
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
