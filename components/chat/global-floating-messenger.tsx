"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { Button } from "@/components/ui/button";
import type { FloatingConversationRow } from "@/actions/message.actions";
import { getPusherClient } from "@/lib/pusher-client";
import { playWaterDropMessageSound } from "@/lib/message-sound";
import {
  getLandingChatMessages,
  sendLandingChatAdminReply,
} from "@/actions/landing.actions";

type IncomingMessage = {
  sender: { id: string };
};

type LandingChatMessage = {
  id: string;
  body: string;
  sender: string;
  createdAt: string;
};

export function GlobalFloatingMessenger({
  conversations,
  currentUserId,
}: {
  conversations: FloatingConversationRow[];
  currentUserId: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "");

  const hiddenOnMessagesPage =
    pathname === "/messages" ||
    pathname.endsWith("/messages") ||
    pathname.includes("/messages/");

  const ordered = useMemo(() => {
    if (!activeId) return conversations;
    const active = conversations.find((item) => item.id === activeId);
    const rest = conversations.filter((item) => item.id !== activeId);
    return active ? [active, ...rest] : conversations;
  }, [activeId, conversations]);

  const active = ordered[0] ?? null;
  const activeContactKey = active
    ? active.avatarUserId ?? `${active.avatarName}-${active.avatarUrl ?? ""}`
    : "";
  const quickContacts = useMemo(() => {
    const seen = new Set<string>();
    return ordered.filter((conversation) => {
      const key =
        conversation.avatarUserId ??
        `${conversation.avatarName}-${conversation.avatarUrl ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [ordered]);
  const unreadCount = conversations.filter((item) => item.unread).length;

  useEffect(() => {
    if (hiddenOnMessagesPage || conversations.length === 0) return;

    const pusher = getPusherClient();
    const subscribedChannels = conversations
      .filter((conversation) => conversation.kind !== "landing-chat")
      .map((conversation) => {
      const channelName = `conversation-${conversation.id}`;
      const channel = pusher.subscribe(channelName);
      channel.bind("new-message", (message: IncomingMessage) => {
        if (message.sender.id !== currentUserId) {
          void playWaterDropMessageSound();
        }
      });
      return channelName;
    });

    return () => {
      subscribedChannels.forEach((channelName) => {
        const channel = pusher.channel(channelName);
        channel?.unbind("new-message");
        pusher.unsubscribe(channelName);
      });
    };
  }, [conversations, currentUserId, hiddenOnMessagesPage]);

  if (hiddenOnMessagesPage || !currentUserId) return null;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close messenger"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[min(94vw,560px)] md:right-6">
          <div className="mb-2 flex justify-end">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setOpen(false)}
              aria-label="Close messenger"
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background shadow-2xl">
            <div className="border-b p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Quick messages</p>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0
                      ? `${unreadCount} unread conversation${
                          unreadCount === 1 ? "" : "s"
                        }`
                      : "All conversations are ready"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {quickContacts.map((conversation) => {
                  const contactKey =
                    conversation.avatarUserId ??
                    `${conversation.avatarName}-${conversation.avatarUrl ?? ""}`;
                  return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveId(conversation.id)}
                    className={`flex min-w-[86px] flex-col items-center gap-1 rounded-md border px-2 py-2 text-center transition-colors ${
                      contactKey === activeContactKey
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                    title={conversation.name}
                  >
                    <Avatar
                      name={conversation.avatarName}
                      imageUrl={conversation.avatarUrl}
                      unread={conversation.unread}
                    />
                    <span className="line-clamp-1 max-w-[74px] text-[11px] font-medium">
                      {conversation.avatarName}
                    </span>
                  </button>
                  );
                })}
                {quickContacts.length === 0 && (
                  <p className="w-full rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No conversations yet. Open Messages to start one.
                  </p>
                )}
              </div>
            </div>

            {active ? (
              active.kind === "landing-chat" ? (
                <LandingChatPanel key={active.id} chat={active} />
              ) : (
                <ChatPanel
                  key={active.id}
                  conversationId={active.id}
                  currentUserId={currentUserId}
                  title={active.name}
                  heightClass="h-[480px] max-h-[58vh]"
                  playIncomingSound={false}
                />
              )
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No conversation selected
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105"
        aria-label="Open messages"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}

function LandingChatPanel({ chat }: { chat: FloatingConversationRow }) {
  const [messages, setMessages] = useState<LandingChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    getLandingChatMessages(chat.id).then((result) => {
      if (!alive) return;
      if ("messages" in result && Array.isArray(result.messages)) {
        setMessages(result.messages);
      }
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [chat.id]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    const result = await sendLandingChatAdminReply(chat.id, body);
    if (!result.error) {
      setMessages((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          body,
          sender: "ADMIN",
          createdAt: new Date().toISOString(),
        },
      ]);
      setText("");
    }
    setSending(false);
  };

  return (
    <div className="flex h-[480px] max-h-[58vh] flex-col">
      <div className="border-b px-4 py-3">
        <p className="font-semibold">{chat.avatarName}</p>
        <p className="text-xs text-muted-foreground">{chat.subtitle}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">
            Loading live chat...
          </p>
        ) : messages.length ? (
          messages.map((message) => {
            const mine = message.sender === "ADMIN";
            return (
              <div
                key={message.id}
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold opacity-70">
                  {mine ? "Admin" : chat.avatarName}
                </p>
                {message.body}
              </div>
            );
          })
        ) : (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">
            Chat started. No message yet.
          </p>
        )}
      </div>
      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Reply to visitor..."
            className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <Button type="button" onClick={() => void send()} disabled={sending}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function Avatar({
  name,
  imageUrl,
  unread,
}: {
  name: string;
  imageUrl: string | null;
  unread: boolean;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-semibold">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials || "?"
      )}
      {unread && (
        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
      )}
    </span>
  );
}
