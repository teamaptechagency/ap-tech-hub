import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { renderEmail } from "@/lib/email-template";
import { sendWhatsAppNotification } from "@/lib/whatsapp";

// One call = in-app notification + optional email + optional WhatsApp.
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
  await prisma.notification.create({
    data: { userId, title, body: body ?? null, href: href ?? null },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, phone: true },
  });
  if (!user) return;

  const base =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const absoluteHref = href ? `${base}${href}` : null;

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "AP Tech Hub <onboarding@resend.dev>",
        to: user.email,
        subject: title,
        html: renderEmail({
          title,
          eyebrow: "Portal notification",
          greeting: `Hi ${user.name},`,
          intro: body,
          action: absoluteHref
            ? { label: "Open in portal", href: absoluteHref }
            : undefined,
          footerNote:
            "This notification was also saved inside your AP Tech Hub account.",
        }),
      });
    }
  } catch (e) {
    console.error("Email send failed:", e);
  }

  try {
    if (user.phone) {
      await sendWhatsAppNotification({
        phone: user.phone,
        title,
        body,
        href: absoluteHref,
      });
    }
  } catch (e) {
    console.error("WhatsApp notification failed:", e);
  }
}

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
