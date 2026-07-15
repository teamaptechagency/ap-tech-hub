import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

// ============================================
// ONE CALL = in-app notification + email
// WhatsApp slot reserved for the future
// ============================================
export async function notify({
  userId,
  title,
  body,
  href,
}: {
  userId: string;
  title: string;
  body?: string;
  href?: string;
}) {
  // 1) In-app (bell)
  await prisma.notification.create({
    data: { userId, title, body: body ?? null, href: href ?? null },
  });

  // 2) Email (fire-and-forget — never block the action)
  try {
    if (!process.env.RESEND_API_KEY) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const base = process.env.APP_URL ?? "http://localhost:3000";

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "AP Tech Hub <onboarding@resend.dev>",
      to: user.email,
      subject: title,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 4px">AP Tech <span style="color:#c6613f">Hub</span></h2>
          <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
          <p style="font-size:15px;margin:0 0 6px"><b>${title}</b></p>
          ${body ? `<p style="font-size:14px;color:#444;margin:0 0 16px">${body}</p>` : ""}
          ${
            href
              ? `<a href="${base}${href}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:9px 18px;border-radius:6px;font-size:13px;text-decoration:none">Open in portal</a>`
              : ""
          }
          <p style="font-size:11px;color:#999;margin-top:24px">AP Tech Agency · this is an automated notification</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Email send failed:", e);
  }

  // 3) WhatsApp — future (structure reserved)
}

// Notify all admins at once
export async function notifyAdmins(payload: {
  title: string;
  body?: string;
  href?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "CEO"] } },
    select: { id: true },
  });
  for (const admin of admins) {
    await notify({ userId: admin.id, ...payload });
  }
}