"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, ExternalLink, MessageSquareText, Plus, Upload } from "lucide-react";

import {
  addSpecialOrderMessage,
  saveSpecialOrderField,
  toggleSpecialOrderFieldDone,
  toggleSpecialOrderMessageDone,
  updateSpecialOrderBuyerName,
  updateSpecialOrderConversationBreak,
} from "@/actions/special-order.actions";
import { getPusherClient } from "@/lib/pusher-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ScriptMessage = {
  id: string;
  sender: "BUYER" | "SELLER";
  message: string;
  attachment?: string;
  done: boolean;
  createdAt: string;
  copiedAt?: string;
};

const BREAK_PRESETS = [
  { label: "1 minute", minutes: 1 },
  { label: "10 minutes", minutes: 10 },
  { label: "20 minutes", minutes: 20 },
  { label: "1 day", minutes: 1440 },
  { label: "2 days", minutes: 2880 },
];

type ConversationField = {
  id?: string;
  type:
    | "BRIEF"
    | "CREDENTIAL"
    | "IMPORTANT"
    | "AIDOC"
    | "DOCUMENT"
    | "CLIENT_REVIEW"
    | "SELLER_REVIEW";
  value: string;
  url?: string;
  done?: boolean;
  updatedAt: string;
};

type ConversationWorkspaceProps = {
  orderId: string;
  profileName: string;
  buyerName: string | null;
  messages: ScriptMessage[];
  fields: ConversationField[];
  viewerRole?: "ADMIN" | "PARTNER" | "CLIENT" | "EMPLOYEE";
  readOnly?: boolean;
  buyerNameEditable?: boolean;
  actionsLocked?: boolean;
  conversationBreakMinutes?: number;
};

const fieldLabels: Record<ConversationField["type"], string> = {
  BRIEF: "Brief",
  CREDENTIAL: "Credential",
  IMPORTANT: "Important",
  AIDOC: "AIDOC",
  DOCUMENT: "Document",
  CLIENT_REVIEW: "Client review",
  SELLER_REVIEW: "Seller review",
};

function fallbackBuyer(name: string | null) {
  return name?.trim() || "Buyer (Client)";
}

function formatCountdown(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function replaceNames(text: string, buyerName: string, sellerName: string) {
  return text
    .replaceAll("Buyer", buyerName)
    .replaceAll("buyer", buyerName)
    .replaceAll("Seller (Me)", sellerName)
    .replaceAll("Seller", sellerName)
    .replaceAll("seller", sellerName);
}

export function ConversationWorkspace({
  orderId,
  profileName,
  buyerName,
  messages: initialMessages,
  fields,
  viewerRole = "ADMIN",
  readOnly = viewerRole !== "ADMIN",
  buyerNameEditable = !readOnly,
  actionsLocked = false,
  conversationBreakMinutes = 1,
}: ConversationWorkspaceProps) {
  const router = useRouter();
  const buyerLabel = fallbackBuyer(buyerName);
  const [buyerEditOpen, setBuyerEditOpen] = useState(false);
  const [buyerValue, setBuyerValue] = useState(buyerName ?? "");
  const [messageOpen, setMessageOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [sender, setSender] = useState<"BUYER" | "SELLER">("BUYER");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState("");
  const [fieldType, setFieldType] =
    useState<ConversationField["type"]>("BRIEF");
  const [editingFieldId, setEditingFieldId] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [fieldUrl, setFieldUrl] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [uploadingField, setUploadingField] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [breakMinutes, setBreakMinutes] = useState(conversationBreakMinutes);
  const [customBreak, setCustomBreak] = useState(
    String(conversationBreakMinutes)
  );
  const [now, setNow] = useState(() => Date.now());
  const visibleFields = fields.filter(
    (field) => field.value?.trim() || field.url?.trim()
  );

  // Live sync: another viewer copying a message or changing the
  // break duration updates this view instantly, no refresh needed.
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`special-order-script-${orderId}`);

    channel.bind(
      "messages-updated",
      (payload: { messages: ScriptMessage[] }) => {
        setMessages(payload.messages);
      }
    );
    channel.bind(
      "break-updated",
      (payload: { conversationBreakMinutes: number }) => {
        setBreakMinutes(payload.conversationBreakMinutes);
        setCustomBreak(String(payload.conversationBreakMinutes));
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`special-order-script-${orderId}`);
    };
  }, [orderId]);

  // Ticks every second so the "wait Xs" countdown on a locked
  // message counts down live and auto-unlocks without a refresh.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function messageLockInfo(index: number) {
    if (index === 0) return { locked: false, waitSec: 0 };
    const previous = messages[index - 1];
    if (!previous.done) return { locked: true, waitSec: 0 };
    if (breakMinutes <= 0 || !previous.copiedAt) {
      return { locked: false, waitSec: 0 };
    }
    const elapsedMs = now - new Date(previous.copiedAt).getTime();
    const requiredMs = breakMinutes * 60_000;
    const waitSec = Math.max(0, Math.ceil((requiredMs - elapsedMs) / 1000));
    return { locked: waitSec > 0, waitSec };
  }

  async function saveBreak(minutes: number) {
    if (!Number.isFinite(minutes) || minutes < 0) return;
    const previous = breakMinutes;
    setBreakMinutes(minutes);
    setCustomBreak(String(minutes));
    const result = await updateSpecialOrderConversationBreak(orderId, minutes);
    if (result?.error) {
      toast.error(result.error);
      setBreakMinutes(previous);
      setCustomBreak(String(previous));
    }
  }

  function fieldLabel(type: ConversationField["type"]) {
    if (type === "CLIENT_REVIEW") {
      return `${buyerLabel} review`;
    }
    if (type === "SELLER_REVIEW") {
      return `${profileName} review`;
    }
    return fieldLabels[type];
  }

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await addSpecialOrderMessage({
      orderId,
      sender,
      message,
      attachment,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("");
    setAttachment("");
    setMessageOpen(false);
    router.refresh();
  }

  async function submitField(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await saveSpecialOrderField({
      orderId,
      fieldId: editingFieldId || undefined,
      type: fieldType,
      value: fieldValue,
      url: fieldUrl,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingFieldId("");
    setFieldValue("");
    setFieldUrl("");
    setFieldOpen(false);
    router.refresh();
  }

  function canToggleMessage(message: ScriptMessage) {
    if (actionsLocked) return false;
    if (message.sender === "BUYER") return viewerRole === "PARTNER";
    return viewerRole === "ADMIN";
  }

  async function toggleDone(messageId: string, index: number) {
    const item = messages[index];
    if (!item || !canToggleMessage(item)) return;

    const { locked } = messageLockInfo(index);
    if (!item.done && locked) return;

    if (!item.done) {
      const text = replaceNames(item.message, buyerLabel, profileName);
      await navigator.clipboard?.writeText(text);
    }
    const result = await toggleSpecialOrderMessageDone(orderId, messageId);
    if (result?.error) toast.error(result.error);
  }

  function canToggleField(field: ConversationField) {
    if (actionsLocked) return false;
    if (field.type === "CLIENT_REVIEW") return viewerRole === "PARTNER";
    if (field.type === "SELLER_REVIEW") return viewerRole === "ADMIN";
    return viewerRole === "ADMIN" || viewerRole === "PARTNER";
  }

  async function toggleFieldDone(field: ConversationField) {
    if (!canToggleField(field)) return;
    if (!field.done) {
      const text = replaceNames(field.value, buyerLabel, profileName);
      await navigator.clipboard?.writeText(text);
    }
    await toggleSpecialOrderFieldDone(orderId, field.id ?? field.type);
    router.refresh();
  }

  async function submitBuyerName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await updateSpecialOrderBuyerName(orderId, buyerValue);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBuyerEditOpen(false);
    router.refresh();
  }

  function openNewField() {
    setEditingFieldId("");
    setFieldType("BRIEF");
    setFieldValue("");
    setFieldUrl("");
    setFieldOpen(true);
  }

  function openField(type: ConversationField["type"], field?: ConversationField) {
    setFieldType(type);
    setEditingFieldId(field?.id ?? "");
    setFieldValue(field?.value ?? "");
    setFieldUrl(field?.url ?? "");
    setFieldOpen(true);
  }

  async function uploadFieldFile(file: File | null) {
    if (!file) return;
    setUploadingField(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      body,
    });
    const payload = await response.json().catch(() => null);
    setUploadingField(false);
    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? "File upload failed");
      return;
    }
    setFieldUrl(payload.attachment?.fileUrl ?? "");
    if (!fieldValue.trim()) {
      setFieldValue(payload.attachment?.fileName ?? file.name);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="min-h-[520px]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                Conversation script
              </span>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setMessageOpen(true)}
                className={readOnly ? "hidden" : ""}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <p className="text-xs text-muted-foreground">
              {actionsLocked
                ? "Completed order is view only. Copy and check actions are locked."
                : "Click the check box to copy text and mark it done. Each message unlocks after the one before it is copied."}
            </p>
            {viewerRole === "ADMIN" && !actionsLocked && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Break between messages:
                </span>
                {BREAK_PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => saveBreak(preset.minutes)}
                    className={`rounded-full border px-2 py-0.5 ${
                      breakMinutes === preset.minutes
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:border-primary/40"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    value={customBreak}
                    onChange={(event) => setCustomBreak(event.target.value)}
                    onBlur={() => {
                      const parsed = Number(customBreak);
                      if (parsed !== breakMinutes) saveBreak(parsed);
                    }}
                    className="h-6 w-16 text-xs"
                  />
                  <span className="text-muted-foreground">min (custom)</span>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (buyerNameEditable && !actionsLocked) setBuyerEditOpen(true);
              }}
              className={`w-full rounded-md border bg-muted/20 p-3 text-left transition-colors ${
                buyerNameEditable && !actionsLocked ? "hover:border-primary/40" : ""
              }`}
            >
              <p className="text-xs text-muted-foreground">Buyer name</p>
              <p className="mt-1 text-sm font-medium">{buyerLabel}</p>
            </button>
            {messages.length === 0 && (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No script messages yet
              </p>
            )}
            {messages.map((item, index) => {
              const label =
                item.sender === "BUYER" ? buyerLabel : profileName;
              const display = replaceNames(item.message, buyerLabel, profileName);
              const permissionDenied = !canToggleMessage(item);
              const { locked, waitSec } = messageLockInfo(index);
              const sequenceLocked = !item.done && locked;
              const disabled = permissionDenied || sequenceLocked;
              const isNextUp =
                !item.done && !sequenceLocked && !permissionDenied;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedMessageId(item.id)}
                  className={`rounded-md border p-3 transition-colors ${
                    item.done
                      ? "border-emerald-500/30 bg-muted text-muted-foreground opacity-70"
                      : sequenceLocked
                        ? "border-dashed border-muted bg-muted/30 opacity-60"
                        : isNextUp
                          ? "border-primary bg-primary/5"
                          : selectedMessageId === item.id
                            ? "border-primary/70 bg-primary/10"
                            : "bg-background"
                  } ${permissionDenied ? "border-muted bg-muted/30" : ""}`}
                  title={
                    permissionDenied
                      ? item.sender === "BUYER"
                        ? actionsLocked
                          ? "Completed orders are view only"
                          : "Only partner can copy and mark this message"
                        : actionsLocked
                          ? "Completed orders are view only"
                          : "Only admin can copy and mark this message"
                      : sequenceLocked
                        ? waitSec > 0
                          ? `Wait ${formatCountdown(waitSec)} before copying this message`
                          : "Copy the previous message first"
                        : undefined
                  }
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleDone(item.id, index)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        item.done
                          ? "bg-emerald-500 text-background"
                          : disabled
                            ? "cursor-not-allowed bg-muted text-transparent opacity-60"
                            : "bg-background text-transparent"
                      }`}
                      title={
                        disabled
                          ? "You do not have permission to check this"
                          : "Copy and mark done"
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {label}
                        </p>
                        {item.done && (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                            Copied
                          </span>
                        )}
                        {isNextUp && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Active
                          </span>
                        )}
                        {sequenceLocked && waitSec > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                            <Clock className="h-2.5 w-2.5" />
                            {formatCountdown(waitSec)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                        {display}
                      </p>
                      {item.attachment && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Attachment: {item.attachment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-h-[520px]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span>Brief / Credential / Important</span>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={openNewField}
                className={readOnly ? "hidden" : ""}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <p className="text-xs text-muted-foreground">
              {actionsLocked
                ? "Completed order is view only. Copy and check actions are locked."
                : "Click the check box to copy text and mark it done."}
            </p>
            {visibleFields.length === 0 && (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No brief, credential or document added yet
              </p>
            )}
            {visibleFields.map(
              (field, index) => {
                const fieldKey = field.id ?? `${field.type}-${index}`;
                const disabled = !canToggleField(field);
                return (
                  <div
                    key={fieldKey}
                    onClick={() => setSelectedFieldId(fieldKey)}
                    className={`rounded-md border p-3 transition-colors ${
                      field.done
                        ? "bg-muted text-muted-foreground opacity-70"
                        : selectedFieldId === fieldKey
                          ? "border-primary/70 bg-primary/10"
                          : "bg-muted/20"
                    } ${disabled ? "border-muted bg-muted/30" : ""}`}
                    title={
                      disabled
                        ? actionsLocked
                          ? "Completed orders are view only"
                          : field.type === "SELLER_REVIEW"
                            ? "Only admin can check this item"
                            : field.type === "CLIENT_REVIEW"
                              ? "Only partner can check this item"
                              : "You can view this item only"
                        : undefined
                    }
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFieldDone(field);
                        }}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          field.done
                            ? "bg-muted-foreground text-background"
                            : disabled
                              ? "cursor-not-allowed bg-muted text-transparent opacity-60"
                              : "bg-background text-transparent hover:border-primary"
                        }`}
                        title={
                          disabled
                            ? "You do not have permission to check this"
                            : "Copy and mark done"
                        }
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFieldId(fieldKey)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-xs text-muted-foreground">
                          {fieldLabel(field.type)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                          {replaceNames(field.value, buyerLabel, profileName)}
                        </p>
                        {field.url && (
                          <a
                            href={field.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{field.url}</span>
                          </a>
                        )}
                      </button>
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => openField(field.type, field)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add message</DialogTitle>
            <DialogDescription>
              Add one script message. It will appear in order below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitMessage} className="space-y-4">
            <div className="space-y-2">
              <Label>Sender</Label>
              <Select
                value={sender}
                onValueChange={(value) =>
                  setSender(value === "SELLER" ? "SELLER" : "BUYER")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUYER">{buyerLabel}</SelectItem>
                  <SelectItem value="SELLER">{profileName}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-40"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Attachment note / URL</Label>
              <Input
                value={attachment}
                onChange={(event) => setAttachment(event.target.value)}
                placeholder="File URL or note"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Adding..." : "Add message"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={buyerEditOpen} onOpenChange={setBuyerEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit buyer name</DialogTitle>
            <DialogDescription>
              This name will be used anywhere Buyer appears in the script.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBuyerName} className="space-y-4">
            <div className="space-y-2">
              <Label>Buyer name</Label>
              <Input
                value={buyerValue}
                onChange={(event) => setBuyerValue(event.target.value)}
                placeholder="Buyer (Client)"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save buyer name"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={fieldOpen} onOpenChange={setFieldOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFieldId ? "Edit field" : "Add field"}</DialogTitle>
            <DialogDescription>
              Save brief, credential, important notes, AIDOC or document
              details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitField} className="space-y-4">
            <div className="space-y-2">
              <Label>Field type</Label>
              <Select
                value={fieldType}
                onValueChange={(value) =>
                  setFieldType(
                    (value as ConversationField["type"]) || "BRIEF"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(fieldLabels) as ConversationField["type"][]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {fieldLabel(type)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={fieldValue}
                onChange={(event) => setFieldValue(event.target.value)}
                className="min-h-40"
              />
            </div>
            <div className="space-y-2">
              <Label>URL / file note</Label>
              <Input
                value={fieldUrl}
                onChange={(event) => setFieldUrl(event.target.value)}
                placeholder="https://..."
              />
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={(event) =>
                    uploadFieldFile(event.currentTarget.files?.[0] ?? null)
                  }
                />
                <Button type="button" variant="outline" disabled={uploadingField}>
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  {uploadingField ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : editingFieldId ? "Save field" : "Add field"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
