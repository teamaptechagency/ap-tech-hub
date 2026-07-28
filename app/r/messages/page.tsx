import { Card, CardContent } from "@/components/ui/card";

export default function ReferralMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Communication for referrals and project opportunities.
        </p>
      </div>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Dedicated referral/project communication threads will appear here
          when AP Tech opens them. Internal notes are never shown to partners.
        </CardContent>
      </Card>
    </div>
  );
}
