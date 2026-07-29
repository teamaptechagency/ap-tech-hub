"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  addBusinessDocument,
  addBusinessRegistration,
  addComplianceReminder,
  addInternationalEntity,
  saveBusinessPolicies,
  saveBusinessProfile,
} from "@/actions/business-settings.actions";
import type { BusinessPolicySlug } from "@/lib/business-content";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Visibility = "PUBLIC" | "PRIVATE" | "MASKED" | "DRAFT";
type Verification = "VERIFIED" | "PENDING_VERIFICATION" | "NOT_PUBLISHED" | "EXPIRED" | "RENEWAL_REQUIRED";

type ProfileInput = {
  legalName?: string | null;
  tradingName: string;
  legalStructure?: string | null;
  businessType: string;
  country: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  establishedYear?: number | null;
  description?: string | null;
  verificationStatus: Verification;
  fieldVisibility?: Record<string, Visibility>;
};

type BusinessSettingsShellProps = {
  profile: ProfileInput;
  policies: Record<BusinessPolicySlug, string>;
  registrations: { id: string; registrationType: string; verificationStatus: string; visibility: string }[];
  entities: { id: string; entityName: string; country: string; businessStatus: string; visibility: string }[];
  documents: { id: string; documentName: string; documentType: string; visibility: string }[];
  reminders: { id: string; reminderType: string; dueDate: string; status: string }[];
};

const visibilityOptions: Visibility[] = ["PUBLIC", "PRIVATE", "MASKED", "DRAFT"];
const verificationOptions: Verification[] = [
  "VERIFIED",
  "PENDING_VERIFICATION",
  "NOT_PUBLISHED",
  "EXPIRED",
  "RENEWAL_REQUIRED",
];

const profileFields = [
  "legalName",
  "tradingName",
  "businessType",
  "country",
  "address",
  "email",
  "phone",
  "website",
  "establishedYear",
  "description",
];

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function BusinessSettingsShell({
  profile,
  policies,
  registrations,
  entities,
  documents,
  reminders,
}: BusinessSettingsShellProps) {
  const [tab, setTab] = useState("general");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    legalName: profile.legalName ?? "",
    tradingName: profile.tradingName,
    legalStructure: profile.legalStructure ?? "",
    businessType: profile.businessType,
    country: profile.country,
    address: profile.address ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    whatsapp: profile.whatsapp ?? "",
    website: profile.website ?? "",
    establishedYear: profile.establishedYear?.toString() ?? "",
    description: profile.description ?? "",
    verificationStatus: profile.verificationStatus,
    fieldVisibility: profile.fieldVisibility ?? {
      tradingName: "PUBLIC",
      businessType: "PUBLIC",
      country: "PUBLIC",
      description: "PUBLIC",
    },
  });
  const [policyForm, setPolicyForm] = useState(policies);

  async function run(
    action: () => Promise<{ error?: string; success?: boolean }>,
    success: string
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    } finally {
      setBusy(false);
    }
  }

  function setField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setVisibility(name: string, value: Visibility) {
    setForm((current) => ({
      ...current,
      fieldVisibility: { ...current.fieldVisibility, [name]: value },
    }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Business Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage public company information, legal policies, registrations, private documents and compliance reminders.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["general", "General Information"],
          ["registration", "Registration and Tax"],
          ["entities", "International Entities"],
          ["payments", "Banking and Payments"],
          ["documents", "Documents"],
          ["policies", "Legal Pages"],
          ["reminders", "Reminders"],
        ].map(([key, title]) => (
          <Button key={key} type="button" size="sm" variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>
            {title}
          </Button>
        ))}
      </div>

      {tab === "general" && (
        <form
          className="space-y-4 rounded-lg border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () =>
                saveBusinessProfile({
                  ...form,
                  verificationStatus: form.verificationStatus,
                  fieldVisibility: form.fieldVisibility,
                }),
              "Business profile saved"
            );
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["legalName", "Legal business name"],
              ["tradingName", "Trading name"],
              ["legalStructure", "Legal structure"],
              ["businessType", "Business type"],
              ["country", "Country of operation"],
              ["address", "Registered address"],
              ["email", "Business email"],
              ["phone", "Business phone"],
              ["whatsapp", "WhatsApp"],
              ["website", "Website"],
              ["establishedYear", "Year established"],
            ].map(([name, title]) => (
              <div key={name} className="space-y-2">
                <Label>{title}</Label>
                <Input value={String(form[name as keyof typeof form] ?? "")} onChange={(event) => setField(name, event.target.value)} />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(event) => setField("description", event.target.value)} rows={4} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Verification status</Label>
              <Select value={form.verificationStatus} onValueChange={(value) => value && setField("verificationStatus", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {verificationOptions.map((option) => <SelectItem key={option} value={option}>{label(option)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm font-semibold">Field visibility</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {profileFields.map((field) => (
                  <div key={field} className="grid grid-cols-[1fr_120px] items-center gap-2">
                    <span className="text-xs text-muted-foreground">{label(field)}</span>
                    <Select value={form.fieldVisibility[field] ?? "PRIVATE"} onValueChange={(value) => value && setVisibility(field, value as Visibility)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {visibilityOptions.map((option) => <SelectItem key={option} value={option}>{label(option)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Button type="submit" disabled={busy}>Save business profile</Button>
        </form>
      )}

      {tab === "registration" && (
        <RecordForm
          title="Add registration or tax record"
          rows={registrations.map((item) => `${item.registrationType} / ${label(item.verificationStatus)} / ${label(item.visibility)}`)}
          fields={["registrationType", "registrationNumber", "issuingAuthority", "issueDate", "expiryDate", "documentUrl", "notes"]}
          selects={{ verificationStatus: verificationOptions, visibility: visibilityOptions }}
          onSubmit={(values) => run(() => addBusinessRegistration(values as any), "Registration record saved")}
          busy={busy}
        />
      )}

      {tab === "entities" && (
        <RecordForm
          title="Add international entity"
          rows={entities.map((item) => `${item.entityName} / ${item.country} / ${label(item.businessStatus)} / ${label(item.visibility)}`)}
          fields={["entityName", "country", "registrationNumber", "incorporationDate", "registeredAddress", "taxReference", "entityPurpose", "websiteUrl", "verificationDocumentUrl"]}
          selects={{
            entityType: ["BANGLADESH_SOLE_PROPRIETORSHIP", "BANGLADESH_PRIVATE_LIMITED_COMPANY", "UK_LIMITED_COMPANY", "US_LLC", "OTHER"],
            businessStatus: ["PLANNED", "REGISTRATION_IN_PROGRESS", "ACTIVE", "DORMANT", "CLOSED"],
            visibility: visibilityOptions,
            verificationStatus: verificationOptions,
          }}
          onSubmit={(values) => run(() => addInternationalEntity(values as any), "International entity saved")}
          busy={busy}
        />
      )}

      {tab === "payments" && (
        <div className="rounded-lg border bg-card p-4 text-sm leading-7 text-muted-foreground">
          Banking and payment details are private admin-only records. Keep bank name, account title, account number, SWIFT, branch, provider, currency and payment instructions out of public pages unless selected for a specific invoice or payment page.
        </div>
      )}

      {tab === "documents" && (
        <RecordForm
          title="Add private business document"
          rows={documents.map((item) => `${item.documentName} / ${item.documentType} / ${label(item.visibility)}`)}
          fields={["documentType", "documentName", "fileUrl", "expiryDate"]}
          selects={{ visibility: visibilityOptions, verificationStatus: verificationOptions }}
          onSubmit={(values) => run(() => addBusinessDocument(values as any), "Business document saved")}
          busy={busy}
        />
      )}

      {tab === "policies" && (
        <form
          className="space-y-4 rounded-lg border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => saveBusinessPolicies(policyForm), "Legal pages saved");
          }}
        >
          {(Object.keys(policyForm) as BusinessPolicySlug[]).map((slug) => (
            <div key={slug} className="space-y-2">
              <Label>{label(slug.replaceAll("-", " "))}</Label>
              <Textarea value={policyForm[slug]} onChange={(event) => setPolicyForm((current) => ({ ...current, [slug]: event.target.value }))} rows={7} />
            </div>
          ))}
          <Button type="submit" disabled={busy}>Save legal pages</Button>
        </form>
      )}

      {tab === "reminders" && (
        <RecordForm
          title="Add compliance reminder"
          rows={reminders.map((item) => `${item.reminderType} / ${item.dueDate} / ${label(item.status)}`)}
          fields={["reminderType", "dueDate", "recurrence", "assignedUserId", "notes"]}
          selects={{ status: ["OPEN", "DONE", "SNOOZED", "CANCELLED"] }}
          onSubmit={(values) => run(() => addComplianceReminder(values as any), "Compliance reminder saved")}
          busy={busy}
        />
      )}
    </div>
  );
}

function RecordForm({
  title,
  fields,
  selects,
  rows,
  onSubmit,
  busy,
}: {
  title: string;
  fields: string[];
  selects: Record<string, string[]>;
  rows: string[];
  onSubmit: (values: Record<string, string>) => void;
  busy: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const key of fields) initial[key] = "";
    for (const [key, options] of Object.entries(selects)) initial[key] = options[0] ?? "";
    return initial;
  });

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
      >
        <h2 className="font-semibold">{title}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field} className="space-y-2">
              <Label>{label(field)}</Label>
              <Input value={values[field] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} />
            </div>
          ))}
          {Object.entries(selects).map(([field, options]) => (
            <div key={field} className="space-y-2">
              <Label>{label(field)}</Label>
              <Select value={values[field] ?? options[0]} onValueChange={(value) => value && setValues((current) => ({ ...current, [field]: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map((option) => <SelectItem key={option} value={option}>{label(option)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <Button type="submit" disabled={busy}>Save</Button>
      </form>

      {rows.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-semibold">Saved records</p>
          {rows.map((row) => (
            <div key={row} className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{row}</div>
          ))}
        </div>
      )}
    </div>
  );
}
