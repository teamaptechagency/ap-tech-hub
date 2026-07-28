import { Card, CardContent } from "@/components/ui/card";

export default function ReferralDocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Agreements, briefs, quotations, invoices, payment slips, and statements.
        </p>
      </div>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Documents are admin-managed in this release. AP Tech can attach
          agreement and project documents after approval.
        </CardContent>
      </Card>
    </div>
  );
}
