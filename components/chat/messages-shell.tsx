"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDirect } from "@/actions/message.actions";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Briefcase, User } from "lucide-react";

type ConvoRow = {
  id: string;
  kind: "JOB" | "DIRECT";
  name: string;
  subtitle: string;
  isClientRelated: boolean;
  lastBody: string | null;
  lastAt: string | null;
  unread: boolean;
};

type Person = { id: string; name: string; role: string };

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "JOBS", label: "Job discussions" },
  { key: "DIRECT", label: "Direct" },
];

export function MessagesShell({
  conversations,
  people,
  currentUserId,
}: {
  conversations: ConvoRow[];
  people: Person[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ConvoRow | null>(
    conversations[0] ?? null
  );
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const filtered = conversations.filter((c) => {
    if (filter === "JOBS" && c.kind !== "JOB") return false;
    if (filter === "DIRECT" && c.kind !== "DIRECT") return false;
    if (
      search &&
      !c.name.toLowerCase().includes(search.toLowerCase()) &&
      !c.subtitle.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  async function startDirect(userId: string) {
    setBusy(true);
    const result = await getOrCreateDirect(userId);
    setBusy(false);
    setNewOpen(false);
    if ("conversationId" in result && result.conversationId) {
      router.refresh();
      // Select it if already in the list; fresh ones appear after refresh
      const existing = conversations.find(
        (c) => c.id === result.conversationId
      );
      if (existing) setSelected(existing);
    }
  }

  function fmtTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return today
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground">
            {conversations.filter((c) => c.unread).length} unread
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New message
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        {/* Conversation list */}
        <Card className="h-fit">
          <CardContent className="space-y-3 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8"
              />
            </div>

            <div className="flex gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    filter === f.key
                      ? "bg-primary/10 font-medium text-primary"
                      : "border text-muted-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="max-h-[480px] space-y-1 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No conversations
                </p>
              )}
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full rounded-md p-2.5 text-left transition-colors ${
                    selected?.id === c.id
                      ? "bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {c.kind === "JOB" ? (
                        <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className={`truncate text-sm ${
                          c.unread ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {c.name}
                      </span>
                      {c.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {fmtTime(c.lastAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.subtitle}
                    {c.lastBody && ` · ${c.lastBody}`}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active chat */}
        {selected ? (
          <ChatPanel
            key={selected.id}
            conversationId={selected.id}
            currentUserId={currentUserId}
            title={selected.name}
            heightClass="h-[460px]"
          />
        ) : (
          <Card>
            <CardContent className="flex h-[560px] items-center justify-center text-sm text-muted-foreground">
              Select a conversation
            </CardContent>
          </Card>
        )}
      </div>

      {/* New direct message dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New direct message</DialogTitle>
            <DialogDescription>
              Team members and client portal users
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {people.map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => startDirect(p.id)}
                className="flex w-full items-center justify-between rounded-md p-2.5 text-left hover:bg-muted"
              >
                <span className="text-sm font-medium">{p.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {p.role.replace("_", " ").toLowerCase()}
                </Badge>
              </button>
            ))}
            {people.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No other users yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}