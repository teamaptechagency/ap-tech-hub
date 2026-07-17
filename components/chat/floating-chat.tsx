"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { Button } from "@/components/ui/button";

export function FloatingChat({
  conversationId,
  currentUserId,
  title = "Private conversation",
}: {
  conversationId: string;
  currentUserId: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close conversation"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(92vw,520px)]">
          <div className="mb-2 flex justify-end">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setOpen(false)}
              aria-label="Close conversation"
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ChatPanel
            conversationId={conversationId}
            currentUserId={currentUserId}
            title={title}
            heightClass="h-[520px] max-h-[62vh]"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105"
        aria-label="Open private conversation"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    </>
  );
}
