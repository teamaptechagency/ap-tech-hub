import { MobileLoginApproval } from "@/components/auth/mobile-login-approval";

export const dynamic = "force-dynamic";

export default async function ApproveSignInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-4">
      <MobileLoginApproval requestId={id} />
    </div>
  );
}
