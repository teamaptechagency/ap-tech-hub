import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
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
        <LoginForm />
      </div>
    </div>
  );
}