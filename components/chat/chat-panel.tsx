"use client";

import { useEffect, useRef, useState } from "react";
import {
  sendMessage,
  getMessages,
  markSeen,
} from "@/actions/message.actions";
import { getPusherClient } from "@/lib/pusher-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageSquare } from "lucide-react";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};

export function ChatPanel({
  conversationId,
  currentUserId,
  title = "Discussion",
  heightClass = "h-[420px]",
}: {
  conversationId: string;
  currentUserId: string;
  title?: string;
  heightClass?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load + mark seen
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getMessages(conversationId);
      if (!cancelled && "messages" in result && result.messages) {
        setMessages(result.messages);
      }
      setLoading(false);
      markSeen(conversationId);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`conversation-${conversationId}`);

    channel.bind("new-message", (msg: ChatMessage) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      markSeen(conversationId);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`conversation-${conversationId}`);
    };
  }, [conversationId]);

  // Auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;

    setBody("");
    setSending(true);
    await sendMessage(conversationId, text);
    setSending(false);
    // Message arrives via Pusher — no local append needed
  }

  return (
    <Card className="flex h-fit flex-col">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className={`flex flex-col gap-3 overflow-y-auto p-4 ${heightClass}`}>
        {loading && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading messages...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No messages yet — start the discussion
          </p>
        )}

        {messages.map((msg) => {
          const mine = msg.sender.id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                    {msg.sender.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm">
                  {msg.body}
                </p>
                <p
                  className={`mt-0.5 text-right text-[10px] ${
                    mine
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </CardContent>

      <div className="border-t p-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={sending || !body.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}