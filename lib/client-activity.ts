import { getEmailConfig } from "@/lib/email-config";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

/**
 * Tells a client something happened on their account — balance moved, a
 * top-up was reviewed, a payment landed.
 *
 * Both an in-portal notification and an email, because money changing on an
 * account is exactly the kind of thing someone should not have to be logged
 * in to find out about. Failures here never block the action that caused
 * them: the money movement has already been committed by the time we notify.
 */
export async function notifyClientActivity({
  clientId,
  title,
  body,
  href,
}: {
  clientId: string;
  title: string;
  body: string;
  href?: string;
}) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true,
        email: true,
        users: { select: { id: true, email: true }, take: 5 },
      },
    });
    if (!client) return;

    // In-portal bell for every linked portal user.
    await Promise.all(
      client.users.map((user) =>
        notify({
          userId: user.id,
          title,
          body,
          href: href ?? "/c/wallet",
        }).catch(() => null)
      )
    );

    const recipients = Array.from(
      new Set(
        [client.email, ...client.users.map((user) => user.email)].filter(
          (email): email is string => Boolean(email?.trim())
        )
      )
    );
    if (recipients.length === 0) return;

    const config = await getEmailConfig();
    if (!config?.resendApiKey) {
      console.log(`[DEV] Client activity mail to ${recipients.join(", ")}: ${title} — ${body}`);
      return;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(config.resendApiKey);

    await resend.emails.send({
      from: config.emailFrom,
      to: recipients,
      subject: title,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
          <h2 style="margin:0 0 12px;font-size:18px;color:#101623">${escapeHtml(title)}</h2>
          <p style="margin:0 0 16px;line-height:1.6;color:#3a4152">${escapeHtml(body)}</p>
          <p style="margin:0;font-size:12px;color:#6b7280">
            AP Tech Agency · ${escapeHtml(client.companyName)}
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Client activity notice failed:", error);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
