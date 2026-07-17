"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMessages,
  markSeen,
  sendMessage,
  sendTypingStatus,
} from "@/actions/message.actions";
import { getPusherClient } from "@/lib/pusher-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { playWaterDropMessageSound } from "@/lib/message-sound";
import {
  MessageSquare,
  Paperclip,
  Send,
  X,
} from "lucide-react";

type UploadedAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
};

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
  attachments?: UploadedAttachment[];
};

export function ChatPanel({
  conversationId,
  currentUserId,
  title = "Discussion",
  heightClass = "h-[420px]",
  playIncomingSound = false,
}: {
  conversationId: string;
  currentUserId: string;
  title?: string;
  heightClass?: string;
  playIncomingSound?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typingName, setTypingName] = useState("");
  const [attachment, setAttachment] =
    useState<UploadedAttachment | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`conversation-${conversationId}`);

    channel.bind("new-message", (msg: ChatMessage) => {
      if (playIncomingSound && msg.sender.id !== currentUserId) {
        void playWaterDropMessageSound();
      }
      setMessages((prev) =>
        prev.some((message) => message.id === msg.id)
          ? prev
          : [...prev, msg]
      );
      markSeen(conversationId);
    });

    channel.bind(
      "typing",
      (event: { userId: string; name: string; isTyping: boolean }) => {
        if (event.userId === currentUserId) return;
        setTypingName(event.isTyping ? event.name || "Someone" : "");
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (event.isTyping) {
          typingTimerRef.current = setTimeout(() => setTypingName(""), 2500);
        }
      }
    );

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      channel.unbind_all();
      pusher.unsubscribe(`conversation-${conversationId}`);
    };
  }, [conversationId, currentUserId, playIncomingSound]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function uploadAttachment(file: File) {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok && data.attachment?.id) {
        setAttachment({
          id: data.attachment.id,
          fileName: data.attachment.fileName,
          fileUrl: data.attachment.fileUrl,
          fileSize: data.attachment.fileSize ?? null,
          mimeType: data.attachment.mimeType ?? null,
        });
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = body.trim();
    if ((!text && !attachment) || sending) return;

    setBody("");
    const attachmentId = attachment?.id;
    setAttachment(null);
    setSending(true);
    await sendTypingStatus(conversationId, false);
    await sendMessage(conversationId, text, attachmentId);
    setSending(false);
  }

  function handleTyping(value: string) {
    setBody(value);
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    if (value.trim()) {
      void sendTypingStatus(conversationId, true);
      stopTypingTimerRef.current = setTimeout(() => {
        void sendTypingStatus(conversationId, false);
      }, 1200);
    } else {
      void sendTypingStatus(conversationId, false);
    }
  }

  return (
    <Card className="flex h-fit flex-col">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent
        className={`flex flex-col gap-3 overflow-y-auto p-4 ${heightClass}`}
      >
        {loading && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Loading messages...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No messages yet - start the discussion
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
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                    {msg.sender.name}
                  </p>
                )}

                {msg.body && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {msg.body}
                  </p>
                )}

                {msg.attachments?.map((file) => (
                  <a
                    key={file.id}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-2 flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                      mine
                        ? "border-primary-foreground/30 text-primary-foreground"
                        : "text-foreground hover:bg-background"
                    }`}
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="truncate">{file.fileName}</span>
                  </a>
                ))}

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
        {typingName && (
          <div className="flex justify-start">
            <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {typingName} is typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </CardContent>

      <div className="border-t p-3">
        {attachment && (
          <div className="mb-2 flex items-center justify-between rounded-md border px-2 py-1 text-xs">
            <span className="flex min-w-0 items-center gap-1">
              <Paperclip className="h-3 w-3 shrink-0" />
              <span className="truncate">{attachment.fileName}</span>
            </span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove attachment"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={body}
            onChange={(event) => handleTyping(event.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border text-muted-foreground hover:bg-muted">
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadAttachment(file);
              }}
            />
          </label>
          <Button
            type="submit"
            size="icon"
            disabled={sending || uploading || (!body.trim() && !attachment)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
