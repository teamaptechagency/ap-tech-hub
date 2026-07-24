"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { startUserImpersonation } from "@/actions/impersonation.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type UserAccessRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: string;
  clientCompany?: string | null;
  phone?: string | null;
  profession?: string | null;
};

function roleLabel(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function UserAccessList({ users }: { users: UserAccessRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.role,
        user.accountStatus,
        user.clientCompany ?? "",
        user.phone ?? "",
        user.profession ?? "",
      ].some((value) => value.toLowerCase().includes(keyword))
    );
  }, [search, users]);

  async function viewProfile(userId: string) {
    setError("");
    setBusyId(userId);
    const result = await startUserImpersonation(userId);
    setBusyId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email, role, company or phone"
        className="max-w-xl"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No user found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="h-full">
              <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {roleLabel(user.role)}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Status: {user.accountStatus.toLowerCase()}</p>
                    {user.clientCompany && <p>Client: {user.clientCompany}</p>}
                    {user.profession && <p>Profession: {user.profession}</p>}
                    {user.phone && <p>Phone: {user.phone}</p>}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => viewProfile(user.id)}
                  disabled={busyId === user.id}
                >
                  {busyId === user.id ? "Opening..." : "View profile as user"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
