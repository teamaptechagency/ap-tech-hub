import { getEmailConfig } from "@/lib/email-config";
import { renderEmail } from "@/lib/email-template";
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
    const base = process.env.APP_URL ?? "http://localhost:3000";
    const actionHref = href
      ? href.startsWith("http")
        ? href
        : `${base}${href}`
      : undefined;

    await resend.emails.send({
      from: config.emailFrom,
      to: recipients,
      subject: title,
      html: renderEmail({
        title,
        eyebrow: "Client account update",
        body,
        details: [{ label: "Client", value: client.companyName }],
        action: actionHref
          ? { label: "View details", href: actionHref }
          : undefined,
        footerNote:
          "You received this email because there was an update on your AP Tech Hub client account.",
      }),
    });
  } catch (error) {
    console.error("Client activity notice failed:", error);
  }
}
