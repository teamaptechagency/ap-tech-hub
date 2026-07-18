"use client";

import type { FormEvent, ReactNode, SelectHTMLAttributes } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bug,
  Lightbulb,
  MessageSquareText,
  Send,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import {
  createSupportTicket,
  updateSupportTicketStatus,
} from "@/actions/support.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SupportTicketRow = {
  id: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  pageUrl: string | null;
  screenshotUrl: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    name: string;
    email: string;
    role: string;
  } | null;
};

const typeOptions = [
  { value: "BUG", label: "Bug report" },
  { value: "FEEDBACK", label: "Feedback" },
  { value: "FEATURE", label: "Feature request" },
  { value: "OTHER", label: "Other" },
];

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const statusOptions = [
  { value: "OPEN", label: "Open" },
  { value: "REVIEWING", label: "Reviewing" },
  { value: "PLANNED", label: "Planned" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const typeIcon = {
  BUG: Bug,
  FEATURE: Lightbulb,
  FEEDBACK: MessageSquareText,
  OTHER: MessageSquareText,
} as const;

export function SupportShell({
  tickets,
  isAdmin = false,
}: {
  tickets: SupportTicketRow[];
  isAdmin?: boolean;
}) {
  const [type, setType] = useState("BUG");
  const [priority, setPriority] = useState("HIGH");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pending, startTransition] = useTransition();

  async function uploadScreenshot(file: File | null) {
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", "public");
    formData.append("assetKind", "support-ticket");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      const fileUrl = payload?.attachment?.fileUrl;

      if (!response.ok || typeof fileUrl !== "string") {
        toast.error(payload?.error ?? "Attachment upload failed");
        return;
      }

      setScreenshotUrl(fileUrl);
      toast.success("Attachment uploaded");
    } catch (error) {
      console.error("Support attachment upload failed:", error);
      toast.error("Attachment upload failed");
    } finally {
      setUploadingFile(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createSupportTicket({
        type,
        priority,
        title,
        description,
        pageUrl,
        screenshotUrl,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setTitle("");
      setDescription("");
      setPageUrl("");
      setScreenshotUrl("");
      toast.success("Saved. Admin team will review it.");
    });
  }

  const openCount = tickets.filter((ticket) => ticket.status !== "CLOSED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bug report & feedback</h1>
        <p className="text-sm text-muted-foreground">
          Report app problems, missing features, UI issues or improvement ideas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Open items" value={openCount} note="Needs review or work" />
        <SummaryCard
          title="Bug reports"
          value={tickets.filter((ticket) => ticket.type === "BUG").length}
          note="Technical or UI problems"
        />
        <SummaryCard
          title="Feedback"
          value={tickets.filter((ticket) => ticket.type !== "BUG").length}
          note="Suggestions and requests"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create report</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Type">
                  <NativeSelect
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Priority">
                  <NativeSelect
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              <Field label="Title">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Mobile menu overlaps chat button"
                  maxLength={160}
                />
              </Field>

              <Field label="Details">
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Write what happened, where it happened, and what should happen instead."
                  rows={6}
                />
              </Field>

              <Field label="Page URL">
                <Input
                  value={pageUrl}
                  onChange={(event) => setPageUrl(event.target.value)}
                  placeholder="Optional: paste the page link"
                />
              </Field>

              <Field label="Screenshot / file">
                <div className="flex gap-2">
                  <Input
                    value={screenshotUrl}
                    onChange={(event) => setScreenshotUrl(event.target.value)}
                    placeholder="No attachment selected"
                  />
                  <Label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted">
                    <UploadCloud className="h-4 w-4" />
                    {uploadingFile ? "Uploading..." : "Attach"}
                    <Input
                      type="file"
                      className="hidden"
                      disabled={uploadingFile || pending}
                      onChange={(event) => {
                        void uploadScreenshot(event.currentTarget.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </Label>
                </div>
              </Field>

              <Button type="submit" disabled={pending} className="w-full gap-2">
                <Send className="h-4 w-4" />
                {pending ? "Saving..." : "Submit report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isAdmin ? "All reports" : "My reports"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No reports yet.
              </div>
            ) : (
              tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} isAdmin={isAdmin} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  note,
}: {
  title: string;
  value: number;
  note: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function TicketCard({
  ticket,
  isAdmin,
}: {
  ticket: SupportTicketRow;
  isAdmin: boolean;
}) {
  const [status, setStatus] = useState(ticket.status);
  const [adminNote, setAdminNote] = useState(ticket.adminNote ?? "");
  const [pending, startTransition] = useTransition();
  const Icon = typeIcon[ticket.type as keyof typeof typeIcon] ?? MessageSquareText;

  function update() {
    startTransition(async () => {
      const result = await updateSupportTicketStatus({
        ticketId: ticket.id,
        status,
        adminNote,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Ticket updated.");
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{ticket.title}</p>
              <Badge text={ticket.type} />
              <Badge text={ticket.priority} tone="warning" />
              <Badge text={ticket.status} tone="success" />
            </div>
            {ticket.reporter && (
              <p className="mt-1 text-xs text-muted-foreground">
                {ticket.reporter.name} - {ticket.reporter.email} -{" "}
                {ticket.reporter.role.replaceAll("_", " ").toLowerCase()}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(ticket.createdAt).toLocaleString("en-GB")}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6">
        {ticket.description}
      </p>

      {(ticket.pageUrl || ticket.screenshotUrl) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {ticket.pageUrl && (
            <a className="text-primary underline" href={ticket.pageUrl}>
              Page link
            </a>
          )}
          {ticket.screenshotUrl && (
            <a className="text-primary underline" href={ticket.screenshotUrl}>
              Screenshot / file
            </a>
          )}
        </div>
      )}

      {ticket.adminNote && !isAdmin && (
        <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin note
          </p>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {ticket.adminNote}
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          <Input
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            placeholder="Admin note"
          />
          <Button type="button" onClick={update} disabled={pending}>
            {pending ? "Saving..." : "Update"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Badge({
  text,
  tone = "default",
}: {
  text: string;
  tone?: "default" | "warning" | "success";
}) {
  const className =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
        : "border-primary/30 bg-primary/10 text-primary";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${className}`}>
      {text.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

function NativeSelect({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary ${className}`}
      {...props}
    />
  );
}
