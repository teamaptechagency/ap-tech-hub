import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function WebsiteManagement() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) redirect("/dashboard");
  return <section className="flex min-h-[75dvh] flex-col gap-3">
    <div><h1 className="text-2xl font-semibold">AP Tech website</h1><p className="text-sm text-muted-foreground">Content, projects, reviews and website connections. Your Hub account controls access.</p></div>
    <iframe title="AP Tech website management" src="/api/agency-workspace?asset=workspace" className="min-h-[75dvh] w-full flex-1 rounded-xl border" />
  </section>;
}
