import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string; next?: string; message?: string; workstationAdmin?: string }>;
}) {
  const params = await searchParams;
  const selectedAdmin = params?.workstationAdmin && params.workstationAdmin.length <= 100 ? await prisma.user.findFirst({ where: { id: params.workstationAdmin, accountStatus: "ACTIVE", role: { in: ["SUPER_ADMIN", "ADMIN", "CEO"] } }, select: { name: true, email: true, role: true } }) : null;
  const initialMessage =
    params?.message
      ? params.message
      : params?.reason === "auth"
      ? "Please sign in first, then we will open your portal."
      : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">
            AP Tech <span className="text-primary">Hub</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your portal
          </p>
        </div>

        {selectedAdmin ? <Link className="mb-4 block text-sm text-primary" href="/workstation-app">← Choose another employee / admin profile</Link> : null}
        <LoginForm selectedAccount={selectedAdmin || undefined} initialMessage={initialMessage} nextPath={params?.next ?? ""} />

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
    </div>
  );
}
