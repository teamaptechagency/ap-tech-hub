"use client";

import { useEffect } from "react";
import { pingPresence } from "@/actions/presence.actions";

// ============================================
// Keeps User.lastActiveAt fresh while a team
// member has the portal open, so their status
// dot on the client Team directory reflects
// real online/offline state. Renders nothing.
// ============================================
export function PresenceHeartbeat() {
  useEffect(() => {
    pingPresence();
    const interval = setInterval(pingPresence, 60_000);
    window.addEventListener("focus", pingPresence);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", pingPresence);
    };
  }, []);

  return null;
}
