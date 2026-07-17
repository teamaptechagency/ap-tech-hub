import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProfileChangeReview } from "@/components/accounts/profile-change-review";

export default async function ProfileReviewsPage() {
  const requests = await prisma.userProfileChangeRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profile change reviews</h1>
          <p className="text-sm text-muted-foreground">
            Approve email, phone and payout changes before they become active.
          </p>
        </div>
        <Link href="/accounts" className="text-sm text-primary hover:underline">
          Back to overview
        </Link>
      </div>

      <ProfileChangeReview
        requests={requests.map((request) => ({
          id: request.id,
          type: request.type,
          oldValue: request.oldValue,
          newValue: request.newValue,
          status: request.status,
          createdAt: request.createdAt.toISOString(),
          withdrawBlockedUntil: request.withdrawBlockedUntil.toISOString(),
          user: {
            name: request.user.name,
            email: request.user.email,
            role: request.user.role,
          },
        }))}
      />
    </div>
  );
}
