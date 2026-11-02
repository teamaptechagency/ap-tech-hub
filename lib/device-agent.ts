import { createHash } from "node:crypto";
import { z } from "zod";

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const agentBatchSchema = z.object({
  source: z.enum(["WINDOWS", "BROWSER"]),
  pcName: z.string().trim().min(1).max(80),
  consent: z.literal(true),
  syncRequestId: z.string().uuid().nullable().optional(),
  events: z.array(z.object({
    id: z.string().uuid(),
    type: z.enum(["ACTIVE", "IDLE", "PAUSED", "REFRESH", "NAVIGATION", "INTERACTIONS"]),
    platform: z.enum(["Windows", "Fiverr", "Upwork", "Freelancer"]),
    clicks: z.number().int().min(0).max(10000).default(0),
    keys: z.number().int().min(0).max(10000).default(0),
    idleSeconds: z.number().int().min(0).max(86400).default(0),
  }).strict()).min(1).max(60),
}).strict();

export function refreshWindow(from: string | null, to: string | null, now = new Date()) {
  const end = to ? new Date(to) : now;
  const start = from ? new Date(from) : new Date(end.getTime() - 3600000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 31 * 86400000) return null;
  return { start, end };
}
