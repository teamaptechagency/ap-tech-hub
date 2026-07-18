import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string; next?: string; message?: string }>;
}) {
  const params = await searchParams;
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

        <LoginForm initialMessage={initialMessage} nextPath={params?.next ?? ""} />

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
