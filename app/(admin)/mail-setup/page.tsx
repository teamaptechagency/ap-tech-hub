import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WebsiteMail } from "@/components/chat/website-mail";

export default async function MailSetupPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) redirect("/dashboard");
  return <WebsiteMail />;
}
