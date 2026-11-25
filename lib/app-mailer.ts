import { randomUUID } from "node:crypto";


const mailboxUrl = "http://127.0.0.1:8788/internal/hub-mail";
async function mailbox(input: Record<string, unknown>) {
  if (!process.env.AP_HUB_CHAT_TOKEN) throw new Error("Email is not configured. Open Mail setup.");
  const r = await fetch(mailboxUrl, { method: "POST", headers: {
    "Content-Type": "application/json", Authorization: `Bearer ${process.env.AP_HUB_CHAT_TOKEN}`,
  }, body: JSON.stringify(input), cache: "no-store", signal: AbortSignal.timeout(90000) });
  const data = await r.json();
  if (!r.ok) throw new Error("Mailbox could not send email. Check Mail setup and Sent before retrying.");
  return data;
}
export async function emailDeliveryConfigured(profile: "communication" | "noreply" = "noreply") {
  try { return Boolean((await mailbox({ op: "settings", profile })).configured); } catch { return false; }
}
export function emailPlainText(html: string) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/(p|div|tr|h[1-6])>|<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n/g, "\n\n").trim();
}
// A shared sender for transactional messages and explicitly requested mail.
// Provider errors throw; callers must never treat a rejected send as delivered.
export class AppMailer {
  constructor(_apiKey?: string, private profile: "communication" | "noreply" = "noreply") {}
  emails = { send: async (input: { from?: string; to: string | string[]; subject: string; html: string }) => {
    const account = await mailbox({ op: "settings", profile: this.profile });
    if (!account.configured) throw new Error("Email is not configured. Open Mail setup.");
    const recipients = Array.isArray(input.to) ? input.to : [input.to];
    for (const to of recipients) {
      const result = await mailbox({ op: "send", profile: this.profile, to, subject: input.subject,
        text: emailPlainText(input.html), revision: account.revision,
        requestKey: randomUUID(), confirmSend: true });
      if (!result.accepted) throw new Error("SMTP acceptance was not confirmed. Check Sent before retrying.");
    }
    return { data: { id: "smtp-accepted" }, error: null };
  }};
}
