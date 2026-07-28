import { ReferredClientForm } from "@/components/referral/referred-client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubmitReferredClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit a client</h1>
        <p className="text-sm text-muted-foreground">
          Client submissions stay pending until AP Tech reviews and verifies them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferredClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
