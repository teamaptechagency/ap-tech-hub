"use client";

import { useEffect, useState } from "react";
import {
  getMyNotifications,
  markAllRead,
} from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

type Note = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    const r = await getMyNotifications();
    setNotes(r.notifications);
    setUnread(r.unread);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, []);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (open && unread > 0) {
          markAllRead().then(load);
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <p className="px-3 py-2 text-sm font-semibold">Notifications</p>
        <div className="max-h-80 overflow-y-auto">
          {notes.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nothing yet
            </p>
          )}
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!n.href) return;
                setOpen(false);
                window.location.href = n.href;
              }}
              className={`block w-full border-t px-3 py-2.5 text-left hover:bg-muted ${
                !n.read ? "bg-primary/5" : ""
              } ${n.href ? "cursor-pointer" : "cursor-default opacity-70"}`}
            >
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {n.body}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
