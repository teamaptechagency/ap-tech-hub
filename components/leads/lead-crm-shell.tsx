"use client";

import {
  Download,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addLeadFollowUp,
  createLead,
  createLeadCollection,
  deleteLead,
  importLeadRows,
  sendLeadBulkEmail,
  sendLeadEmail,
  updateLead,
} from "@/actions/lead.actions";

export type LeadCollectionRow = {
  id: string;
  name: string;
  description?: string | null;
  leadCount: number;
};

export type LeadActivityRow = {
  id: string;
  type: string;
  subject?: string | null;
  body: string;
  status: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type LeadRow = {
  id: string;
  collectionId?: string | null;
  collectionName: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  source: string;
  status: string;
  value?: number | null;
  currency: string;
  tags?: string | null;
  notes?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  updatedAt: string;
  activities: LeadActivityRow[];
};

type Props = {
  collections: LeadCollectionRow[];
  leads: LeadRow[];
  setupMessage?: string;
};

const statuses = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
  "ARCHIVED",
];

const sources = [
  "MANUAL",
  "WEBSITE",
  "IMPORT",
  "FACEBOOK",
  "LINKEDIN",
  "FIVERR",
  "UPWORK",
  "OTHER",
];

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getActionError(result: unknown) {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }
  return null;
}

function dateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function money(value?: number | null, currency = "USD") {
  if (!value) return "No value";
  return `${currency} ${value.toLocaleString()}`;
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return {
      name: row.name,
      company: row.company,
      email: row.email,
      phone: row.phone,
      source: row.source,
      value: row.value,
      tags: row.tags,
      notes: row.notes,
    };
  });
}

function toCsv(leads: LeadRow[]) {
  const headers = [
    "name",
    "company",
    "email",
    "phone",
    "source",
    "status",
    "value",
    "currency",
    "tags",
    "notes",
    "nextFollowUpAt",
  ];

  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };

  return [
    headers.join(","),
    ...leads.map((lead) =>
      [
        lead.name,
        lead.company,
        lead.email,
        lead.phone,
        lead.source,
        lead.status,
        lead.value,
        lead.currency,
        lead.tags,
        lead.notes,
        lead.nextFollowUpAt,
      ]
        .map(escape)
        .join(",")
    ),
  ].join("\n");
}

function downloadCsv(leads: LeadRow[]) {
  const blob = new Blob([toCsv(leads)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ap-tech-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function LeadCrmShell({ collections, leads, setupMessage }: Props) {
  const [selectedCollectionId, setSelectedCollectionId] = useState("ALL");
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id ?? "");
  const [activeSection, setActiveSection] = useState<
    "overview" | "leads" | "bulk" | "followups" | "import"
  >("overview");
  const [search, setSearch] = useState("");
  const [csvText, setCsvText] = useState("");
  const [selectedMailIds, setSelectedMailIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0];

  const visibleLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesCollection =
        selectedCollectionId === "ALL" || lead.collectionId === selectedCollectionId;
      const haystack = [
        lead.name,
        lead.company,
        lead.email,
        lead.phone,
        lead.tags,
        lead.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesCollection && haystack.includes(search.toLowerCase());
    });
  }, [leads, search, selectedCollectionId]);

  const stats = useMemo(
    () => ({
      total: leads.length,
      followUp: leads.filter((lead) => lead.status === "FOLLOW_UP").length,
      qualified: leads.filter((lead) => lead.status === "QUALIFIED").length,
      won: leads.filter((lead) => lead.status === "WON").length,
      selected: selectedMailIds.length,
    }),
    [leads, selectedMailIds.length]
  );

  const emailReadyLeadIds = useMemo(
    () => visibleLeads.filter((lead) => lead.email).map((lead) => lead.id),
    [visibleLeads]
  );

  const selectedEmailLeads = useMemo(
    () => leads.filter((lead) => selectedMailIds.includes(lead.id) && lead.email),
    [leads, selectedMailIds]
  );

  function runAction(action: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      const result = await action();
      const error = getActionError(result);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(success);
    });
  }

  function submitCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    runAction(
      () =>
        createLeadCollection({
          name: String(data.get("name") ?? ""),
          description: String(data.get("description") ?? ""),
        }),
      "Collection created"
    );
    form.reset();
  }

  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    runAction(
      () =>
        createLead({
          collectionId: String(data.get("collectionId") ?? ""),
          name: String(data.get("name") ?? ""),
          company: String(data.get("company") ?? ""),
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          source: String(data.get("source") ?? "MANUAL") as never,
          status: String(data.get("status") ?? "NEW") as never,
          value: String(data.get("value") ?? ""),
          currency: String(data.get("currency") ?? "USD"),
          tags: String(data.get("tags") ?? ""),
          notes: String(data.get("notes") ?? ""),
          nextFollowUpAt: String(data.get("nextFollowUpAt") ?? ""),
        }),
      "Lead added"
    );
    form.reset();
  }

  function submitUpdateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead) return;
    const data = new FormData(event.currentTarget);
    runAction(
      () =>
        updateLead(selectedLead.id, {
          collectionId: String(data.get("collectionId") ?? ""),
          name: String(data.get("name") ?? ""),
          company: String(data.get("company") ?? ""),
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          source: String(data.get("source") ?? "MANUAL") as never,
          status: String(data.get("status") ?? "NEW") as never,
          value: String(data.get("value") ?? ""),
          currency: String(data.get("currency") ?? "USD"),
          tags: String(data.get("tags") ?? ""),
          notes: String(data.get("notes") ?? ""),
          nextFollowUpAt: String(data.get("nextFollowUpAt") ?? ""),
        }),
      "Lead updated"
    );
  }

  function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    runAction(
      () =>
        addLeadFollowUp({
          leadId: selectedLead.id,
          note: String(data.get("note") ?? ""),
          nextFollowUpAt: String(data.get("nextFollowUpAt") ?? ""),
          type: String(data.get("type") ?? "FOLLOW_UP") as never,
        }),
      "Follow-up saved"
    );
    form.reset();
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    runAction(
      () =>
        sendLeadEmail({
          leadId: selectedLead.id,
          subject: String(data.get("subject") ?? ""),
          body: String(data.get("body") ?? ""),
        }),
      "Email sent and logged"
    );
    form.reset();
  }

  function submitBulkEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    runAction(
      () =>
        sendLeadBulkEmail({
          leadIds: selectedMailIds,
          subject: String(data.get("subject") ?? ""),
          body: String(data.get("body") ?? ""),
        }),
      "Bulk email sent and logged"
    );
    form.reset();
  }

  function submitImport() {
    const rows = parseCsv(csvText);
    runAction(
      () =>
        importLeadRows({
          collectionId:
            selectedCollectionId === "ALL" ? undefined : selectedCollectionId,
          rows,
        }),
      "Leads imported"
    );
    setCsvText("");
  }

  return (
    <main className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Lead collections</h1>
          <p className="text-sm text-muted-foreground">
            Collect, import, email and follow up with prospects from one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(visibleLeads)}
          className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export visible leads
        </button>
      </div>

      {setupMessage && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          {setupMessage}
        </div>
      )}

      <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border bg-card p-2">
        {[
          ["overview", "Overview"],
          ["leads", "Leads"],
          ["bulk", `Bulk message (${selectedMailIds.length})`],
          ["followups", "Follow-up"],
          ["import", "Import / Export"],
        ].map(([key, title]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key as typeof activeSection)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeSection === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {title}
          </button>
        ))}
      </div>

      {activeSection === "overview" && (
        <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Total leads", stats.total],
          ["Follow-up", stats.followUp],
          ["Qualified", stats.qualified],
          ["Won", stats.won],
          ["Selected", stats.selected],
        ].map(([title, value]) => (
          <div key={title} className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
        </div>
      )}

      {(activeSection === "leads" ||
        activeSection === "bulk" ||
        activeSection === "import") && (
      <div
        className={
          activeSection === "import"
            ? "grid min-w-0 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]"
            : "grid min-w-0 gap-5"
        }
      >
        {activeSection === "import" && (
        <section className="min-w-0 space-y-5">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">New collection</h2>
            <form onSubmit={submitCollection} className="mt-4 space-y-3">
              <input
                name="name"
                placeholder="Collection name"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                placeholder="Short note"
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <button
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Create collection
              </button>
            </form>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Import leads</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV headers: name, company, email, phone, source, value, tags, notes
            </p>
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={8}
              placeholder="name,company,email,phone,source,value,tags,notes"
              className="mt-4 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              onClick={submitImport}
              disabled={isPending}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Collections</h2>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setSelectedCollectionId("ALL")}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedCollectionId === "ALL" ? "border-primary bg-primary/10" : ""
                }`}
              >
                <span>All leads</span>
                <span>{leads.length}</span>
              </button>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(collection.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedCollectionId === collection.id
                      ? "border-primary bg-primary/10"
                      : ""
                  }`}
                >
                  <span className="min-w-0 truncate">{collection.name}</span>
                  <span>{collection.leadCount}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
        )}

        <section className="min-w-0 space-y-5">
          {activeSection === "leads" && (
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Add lead</h2>
            <LeadForm
              collections={collections}
              onSubmit={submitLead}
              defaultCollectionId={
                selectedCollectionId === "ALL" ? "" : selectedCollectionId
              }
            />
          </div>
          )}

          <div className="rounded-2xl border bg-card">
            <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">
                  {activeSection === "bulk" ? "Select leads" : "Lead list"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeSection === "bulk"
                    ? "Tick multiple leads, then send one message to everyone selected."
                    : "Click any card to edit. Tick leads for bulk email, star important leads."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMailIds(emailReadyLeadIds)}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                >
                  Select emails
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMailIds([])}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                >
                  Clear
                </button>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search leads..."
                  className="rounded-md border bg-background px-3 py-2 text-sm md:w-72"
                />
              </div>
            </div>
            <div className="grid min-w-0 gap-3 p-5 md:grid-cols-2 2xl:grid-cols-3">
              {visibleLeads.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  No leads found.
                </p>
              )}
              {visibleLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      setSelectedLeadId(lead.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`min-h-40 rounded-2xl border p-4 text-left transition hover:border-primary ${
                    selectedLead?.id === lead.id ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMailIds.includes(lead.id)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setSelectedMailIds((current) =>
                            event.target.checked
                              ? [...current, lead.id]
                              : current.filter((id) => id !== lead.id)
                          )
                        }
                        disabled={!lead.email}
                        className="mt-1"
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setFavoriteIds((current) =>
                            current.includes(lead.id)
                              ? current.filter((id) => id !== lead.id)
                              : [...current, lead.id]
                          );
                        }}
                        className="mt-0.5 text-amber-400"
                        aria-label="Mark favorite lead"
                      >
                        <Star
                          className="h-4 w-4"
                          fill={favoriteIds.includes(lead.id) ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{lead.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {[lead.company, lead.email].filter(Boolean).join(" · ") ||
                          "No company/email"}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">
                      {label(lead.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Value</p>
                      <p className="font-medium">{money(lead.value, lead.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p className="font-medium">{label(lead.source)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Next follow-up</p>
                      <p className="font-medium">
                        {lead.nextFollowUpAt
                          ? new Date(lead.nextFollowUpAt).toLocaleString()
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      )}

      {activeSection === "bulk" && (
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-semibold">Bulk message / mail</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedEmailLeads.length} email-ready lead selected. Selected names:
                {" "}
                {selectedEmailLeads.length
                  ? selectedEmailLeads.map((lead) => lead.name).join(", ")
                  : "none"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMailIds([])}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              Clear selection
            </button>
          </div>
          <form onSubmit={submitBulkEmail} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              name="subject"
              placeholder="Subject"
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <textarea
              name="body"
              placeholder="Write the message once. It will be sent/logged for all selected leads."
              rows={3}
              className="rounded-md border bg-background px-3 py-2 text-sm md:row-span-2"
            />
            <button
              disabled={isPending || !selectedMailIds.length}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 md:row-span-2"
            >
              <Mail className="h-4 w-4" />
              Send selected
            </button>
          </form>
        </section>
      )}

      {selectedLead && (activeSection === "leads" || activeSection === "followups") && (
        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          {activeSection === "leads" && (
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Edit lead</h2>
                <p className="text-xs text-muted-foreground">
                  Wrong value, email, status or follow-up date can be fixed here.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  runAction(() => deleteLead(selectedLead.id), "Lead deleted")
                }
                className="inline-flex items-center gap-2 rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
            <LeadForm
              collections={collections}
              lead={selectedLead}
              onSubmit={submitUpdateLead}
            />
          </div>
          )}

          <div className="space-y-5">
            {activeSection === "leads" && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Bulk email selected leads</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedMailIds.length} selected. Use the lead cards above or Select emails.
              </p>
              <form onSubmit={submitBulkEmail} className="mt-4 space-y-3">
                <input
                  name="subject"
                  placeholder="Email subject"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <textarea
                  name="body"
                  placeholder="Message for selected leads..."
                  rows={5}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <button
                  disabled={isPending || !selectedMailIds.length}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  Send to selected
                </button>
              </form>
            </div>
            )}

            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Email this lead</h2>
              <form onSubmit={submitEmail} className="mt-4 space-y-3">
                <input
                  name="subject"
                  placeholder="Email subject"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <textarea
                  name="body"
                  placeholder="Follow-up message..."
                  rows={6}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <button
                  disabled={isPending || !selectedLead.email}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Send email
                </button>
              </form>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Follow-up note</h2>
              <form onSubmit={submitFollowUp} className="mt-4 space-y-3">
                <select
                  name="type"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  defaultValue="FOLLOW_UP"
                >
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="NOTE">Note</option>
                  <option value="CALL">Call</option>
                </select>
                <input
                  name="nextFollowUpAt"
                  type="datetime-local"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <textarea
                  name="note"
                  placeholder="What should happen next?"
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <button
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <RefreshCw className="h-4 w-4" />
                  Save follow-up
                </button>
              </form>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Recent activity</h2>
              <div className="mt-4 space-y-3">
                {selectedLead.activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                )}
                {selectedLead.activities.map((activity) => (
                  <div key={activity.id} className="rounded-xl border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{label(activity.type)}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {activity.subject && (
                      <p className="mt-2 font-medium">{activity.subject}</p>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {activity.body}
                    </p>
                    {activity.status !== "DONE" && (
                      <p className="mt-2 text-xs text-amber-500">
                        Status: {activity.status}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function LeadForm({
  collections,
  lead,
  defaultCollectionId = "",
  onSubmit,
}: {
  collections: LeadCollectionRow[];
  lead?: LeadRow;
  defaultCollectionId?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
      <select
        name="collectionId"
        defaultValue={lead?.collectionId ?? defaultCollectionId}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      >
        <option value="">No collection</option>
        {collections.map((collection) => (
          <option key={collection.id} value={collection.id}>
            {collection.name}
          </option>
        ))}
      </select>
      <input
        name="name"
        defaultValue={lead?.name}
        placeholder="Lead name"
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      <input
        name="company"
        defaultValue={lead?.company ?? ""}
        placeholder="Company"
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        defaultValue={lead?.email ?? ""}
        placeholder="Email"
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      <input
        name="phone"
        defaultValue={lead?.phone ?? ""}
        placeholder="Phone"
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      <select
        name="source"
        defaultValue={lead?.source ?? "MANUAL"}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      >
        {sources.map((source) => (
          <option key={source} value={source}>
            {label(source)}
          </option>
        ))}
      </select>
      <select
        name="status"
        defaultValue={lead?.status ?? "NEW"}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {label(status)}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <input
          name="value"
          type="number"
          min="0"
          step="0.01"
          defaultValue={lead?.value ?? ""}
          placeholder="Lead value"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <input
          name="currency"
          defaultValue={lead?.currency ?? "USD"}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <input
        name="nextFollowUpAt"
        type="datetime-local"
        defaultValue={dateInput(lead?.nextFollowUpAt)}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      <input
        name="tags"
        defaultValue={lead?.tags ?? ""}
        placeholder="Tags, comma separated"
        className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
      />
      <textarea
        name="notes"
        defaultValue={lead?.notes ?? ""}
        placeholder="Lead notes"
        rows={4}
        className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
      />
      <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:col-span-2">
        {lead ? <RefreshCw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {lead ? "Update lead" : "Add lead"}
      </button>
    </form>
  );
}