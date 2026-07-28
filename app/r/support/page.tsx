import { Card, CardContent } from "@/components/ui/card";

export default function ReferralSupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-sm text-muted-foreground">
          Standard support, billable support, out-of-scope items, and partner approvals.
        </p>
      </div>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Use Messages for now to contact AP Tech about a referral. Client
          support never reveals partner commission, profit, or private terms.
        </CardContent>
      </Card>
    </div>
  );
}
