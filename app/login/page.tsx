import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/components/auth/login-form";
import { getBrandingSettings } from "@/lib/branding";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string; next?: string; message?: string; workstationAdmin?: string }>;
}) {
  const params = await searchParams;
  const branding = await getBrandingSettings();
  const hostname = (await headers()).get("host")?.split(":")[0].toLowerCase();
  const clientPortal = hostname === "portal.aptechagency.com";
  const administration = hostname === "manage.aptechagency.com";
  const selectedAdmin = params?.workstationAdmin && params.workstationAdmin.length <= 100 ? await prisma.user.findFirst({ where: { id: params.workstationAdmin, accountStatus: "ACTIVE", role: { in: ["SUPER_ADMIN", "ADMIN", "CEO"] } }, select: { name: true, email: true, role: true } }) : null;
  const initialMessage =
    params?.message
      ? params.message
      : params?.reason === "auth"
      ? "Please sign in first, then we will open your portal."
      : "";

  return (
    <AuthShell administration={administration} branding={branding}>
      <div className="auth-login-form">
        <div className="auth-form-intro">
          <p className="auth-section-kicker">{administration ? "YOUR ADMINISTRATION WORKSPACE" : "WELCOME TO YOUR WORKSPACE"}</p>
          <h1 className="text-2xl font-bold">
            {administration ? (
              <>AP Tech <span className="text-primary">Administration</span></>
            ) : (
              <>AP Tech <span className="text-primary">Hub</span></>
            )}
          </h1>
          <p className="auth-form-tagline">
            {clientPortal ? "Your work. One place." : administration ? "Sign in to your administration panel" : "Sign in to your portal"}
          </p>
        </div>

        {selectedAdmin ? <Link className="mb-4 block text-sm text-primary" href="/workstation-app">← Choose another employee / admin profile</Link> : null}
        <div className="auth-form-card"><LoginForm selectedAccount={selectedAdmin || undefined} initialMessage={initialMessage} nextPath={params?.next ?? ""} /></div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-primary hover:underline"
          >
            Forgot password?
          </Link>
          <Link href="/register" className="text-primary hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
