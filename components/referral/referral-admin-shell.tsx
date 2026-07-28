"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createReferralPartner,
  processReferralWithdrawal,
  updateReferralApplicationStatus,
  updateReferralStatus,
} from "@/actions/referral.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMMISSION_BASES,
  PARTNER_MODES,
  REFERRAL_APPLICATION_STATUSES,
  REFERRAL_STATUSES,
  type ReferralApplicationStatusValue,
  type ReferralStatusValue,
} from "@/lib/referral";

type Application = {
  id: string;
  fullName: string;
  businessName: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  businessType: string | null;
  servicesOffered: string | null;
  expectedReferrals: string | null;
  preferredContact: string | null;
  note: string | null;
  adminNote: string | null;
  status: ReferralApplicationStatusValue;
  createdAt: string;
};

type Partner = {
  id: string;
  code: string;
  displayName: string | null;
  status: string;
  commissionPercent: string;
  clientDiscountPercent: string;
  commissionBasis: string;
  mode: string;
  user: { name: string; email: string };
  _count: { referrals: number };
};

type Referral = {
  id: string;
  leadName: string | null;
  leadEmail: string | null;
  code: string;
  status: ReferralStatusValue;
  reviewNote: string | null;
  clientDiscountPercent: string | null;
  commissionPercent: string | null;
  createdAt: string;
  partner: { code: string; user: { name: string; email: string } };
  client: { companyName: string; email: string } | null;
};

type Withdrawal = {
  id: string;
  amount: string;
  currency: string;
  method: string;
  accountInfo: string;
  note: string | null;
  status: string;
  reference: string | null;
  adminNote: string | null;
  createdAt: string;
  partner: { code: string; user: { name: string; email: string } };
};

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ReferralAdminShell({
  applications,
  partners,
  referrals,
  withdrawals,
}: {
  applications: Application[];
  partners: Partner[];
  referrals: Referral[];
  withdrawals: Withdrawal[];
}) {
  const [pending, startTransition] = useTransition();
  const [manual, setManual] = useState({
    name: "",
    email: "",
    password: "",
    commissionPercent: "10",
    clientDiscountPercent: "5",
    commissionBasis: "RECEIVED",
    mode: "REFERRAL",
    agreementNote: "",
  });

  function updateApplication(
    applicationId: string,
    status: ReferralApplicationStatusValue,
    adminNote?: string
  ) {
    startTransition(async () => {
      const result = await updateReferralApplicationStatus({
        applicationId,
        status,
        adminNote,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Application updated");
    });
  }

  function updateReferral(referralId: string, status: ReferralStatusValue) {
    startTransition(async () => {
      const result = await updateReferralStatus({ referralId, status });
      if (result.error) toast.error(result.error);
      else toast.success("Referral updated");
    });
  }

  function createManualPartner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createReferralPartner({
        name: manual.name,
        email: manual.email,
        password: manual.password,
        terms: manual,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Partner created: ${result.code}`);
        setManual((current) => ({ ...current, name: "", email: "", password: "" }));
      }
    });
  }

  function processWithdrawal(
    withdrawalId: string,
    status:
      | "UNDER_REVIEW"
      | "APPROVED"
      | "PROCESSING"
      | "PAID"
      | "REJECTED"
      | "CANCELLED"
  ) {
    startTransition(async () => {
      const result = await processReferralWithdrawal({
        withdrawalId,
        status,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Withdrawal updated");
    });
  }

  function approveApplication(application: Application) {
    startTransition(async () => {
      const result = await createReferralPartner({
        name: application.fullName,
        email: application.email,
        password: `APT-${application.id.slice(0, 10)}`,
        applicationId: application.id,
        terms: {
          commissionPercent: "10",
          clientDiscountPercent: "5",
          commissionBasis: "RECEIVED",
          mode: "REFERRAL",
          displayName: application.businessName || application.fullName,
          agreementNote: application.note || undefined,
        },
      });
      if (result.error) toast.error(result.error);
      else toast.success(`Partner approved: ${result.code}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Applications</p>
            <p className="mt-1 text-2xl font-bold">{applications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active partners</p>
            <p className="mt-1 text-2xl font-bold">
              {partners.filter((partner) => partner.status === "ACTIVE").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Referral records</p>
            <p className="mt-1 text-2xl font-bold">{referrals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Withdrawals</p>
            <p className="mt-1 text-2xl font-bold">{withdrawals.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual partner addition</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createManualPartner} className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={manual.name}
                onChange={(event) => setManual({ ...manual, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={manual.email}
                onChange={(event) => setManual({ ...manual, email: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password for new account</Label>
              <Input
                type="password"
                value={manual.password}
                onChange={(event) => setManual({ ...manual, password: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Commission %</Label>
                <Input
                  value={manual.commissionPercent}
                  onChange={(event) =>
                    setManual({ ...manual, commissionPercent: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input
                  value={manual.clientDiscountPercent}
                  onChange={(event) =>
                    setManual({ ...manual, clientDiscountPercent: event.target.value })
                  }
                />
              </div>
            </div>
            <SelectField
              label="Basis"
              value={manual.commissionBasis}
              onChange={(value) => setManual({ ...manual, commissionBasis: value })}
              options={COMMISSION_BASES}
            />
            <SelectField
              label="Mode"
              value={manual.mode}
              onChange={(value) => setManual({ ...manual, mode: value })}
              options={PARTNER_MODES}
            />
            <div className="space-y-2 lg:col-span-2">
              <Label>Agreement note</Label>
              <Input
                value={manual.agreementNote}
                onChange={(event) =>
                  setManual({ ...manual, agreementNote: event.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending} className="w-full">
                Add partner
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            applications.map((application) => (
              <div key={application.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {application.fullName}
                      {application.businessName ? ` - ${application.businessName}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {application.email}
                      {application.phone ? ` · ${application.phone}` : ""}
                      {application.country ? ` · ${application.country}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {application.businessType || "Business type not set"}
                      {application.servicesOffered
                        ? ` · ${application.servicesOffered}`
                        : ""}
                    </p>
                    {application.note ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm">{application.note}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline">{application.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => approveApplication(application)}
                  >
                    Approve and create account
                  </Button>
                  {REFERRAL_APPLICATION_STATUSES.filter(
                    (status) => status !== "APPROVED"
                  ).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => updateApplication(application.id, status)}
                    >
                      {status.replaceAll("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referral verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {referrals.map((referral) => (
            <div key={referral.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {referral.leadName || referral.client?.companyName || "Unnamed client"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {referral.leadEmail || referral.client?.email || "No email"} ·{" "}
                    {referral.partner.user.name} · {referral.code}
                  </p>
                  {referral.reviewNote ? (
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
                      {referral.reviewNote}
                    </pre>
                  ) : null}
                </div>
                <Badge variant="outline">{referral.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {REFERRAL_STATUSES.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={status === referral.status ? "default" : "outline"}
                    disabled={pending}
                    onClick={() => updateReferral(referral.id, status)}
                  >
                    {status.replaceAll("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No withdrawal requests yet.
            </p>
          ) : (
            withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {withdrawal.partner.user.name} · {withdrawal.method}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {withdrawal.partner.user.email} · {withdrawal.partner.code}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
                      {withdrawal.accountInfo}
                    </pre>
                    {withdrawal.note ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {withdrawal.note}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {withdrawal.currency} {withdrawal.amount}
                    </p>
                    <Badge variant="outline">{withdrawal.status}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "UNDER_REVIEW",
                    "APPROVED",
                    "PROCESSING",
                    "PAID",
                    "REJECTED",
                    "CANCELLED",
                  ].map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={status === withdrawal.status ? "default" : "outline"}
                      disabled={pending}
                      onClick={() =>
                        processWithdrawal(
                          withdrawal.id,
                          status as
                            | "UNDER_REVIEW"
                            | "APPROVED"
                            | "PROCESSING"
                            | "PAID"
                            | "REJECTED"
                            | "CANCELLED"
                        )
                      }
                    >
                      {status.replaceAll("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partner accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-medium">{partner.user.name}</p>
                <p className="text-muted-foreground">
                  {partner.user.email} · {partner.code} · {partner.mode}
                </p>
              </div>
              <p className="text-muted-foreground">
                {partner.clientDiscountPercent}% discount · {partner.commissionPercent}%
                commission · {partner._count.referrals} referrals
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
