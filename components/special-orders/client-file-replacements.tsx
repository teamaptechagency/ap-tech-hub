"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, Download, ExternalLink, Upload, X } from "lucide-react";
import { toast } from "sonner";

import {
  reviewSpecialOrderFileReplacement,
  submitSpecialOrderFileReplacement,
} from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ClientFileReplacement,
  ClientFileVersion,
} from "@/lib/special-order-file-replacement";
import { fileDownloadUrl, fileViewUrl } from "@/lib/file-url";

type ReplaceableField = {
  id?: string;
  type: string;
  value: string;
  audience?: string[];
};

export function ClientFileReplacements({
  orderId,
  fields,
  pending,
  previous,
  admin = false,
}: {
  orderId: string;
  fields: ReplaceableField[];
  pending: ClientFileReplacement[];
  previous: ClientFileVersion[];
  admin?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const replaceable = fields.filter(
    (field) =>
      Boolean(field.id) &&
      (field.type === "DOCUMENT" || field.type === "DELIVERY_DOCUMENT") &&
      field.audience?.includes("CLIENT")
  );

  async function upload(field: ReplaceableField, file: File | null) {
    if (!file || !field.id) return;
    setBusyId(field.id);
    const body = new FormData();
    body.append("file", file);
    body.append("specialOrderId", orderId);
    const response = await fetch("/api/upload", { method: "POST", body });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.attachment?.fileUrl) {
      setBusyId("");
      toast.error(payload?.error ?? "File upload failed");
      return;
    }
    const result = await submitSpecialOrderFileReplacement({
      orderId,
      targetFieldId: field.id,
      fileUrl: payload.attachment.fileUrl,
      fileName: payload.attachment.fileName ?? file.name,
    });
    setBusyId("");
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("File sent for admin verification");
    router.refresh();
  }

  async function review(id: string, approved: boolean) {
    setBusyId(id);
    const result = await reviewSpecialOrderFileReplacement(orderId, id, approved);
    setBusyId("");
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(approved ? "Client file approved and replaced" : "Client file rejected");
    router.refresh();
  }

  if (admin && pending.length === 0 && previous.length === 0) return null;
  if (!admin && replaceable.length === 0) return null;

  return (
    <Card className={admin ? "border-amber-500/40" : undefined}>
      <CardHeader>
        <CardTitle className="text-base">
          {admin ? "Client file verification" : "Replace a shared file"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {admin
          ? pending.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {item.targetFieldType === "DELIVERY_DOCUMENT" ? "Delivery file" : "Client file"} · uploaded by {item.submittedByName}
                  </p>
                  <p className="mt-1 text-sm font-medium">{item.fileName}</p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <a className="inline-flex items-center gap-1 text-primary hover:underline" href={fileViewUrl(item.url)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3 w-3" /> Live preview
                    </a>
                    <a className="inline-flex items-center gap-1 text-primary hover:underline" href={fileDownloadUrl(item.url)} target="_blank" rel="noreferrer" download>
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button disabled={busyId === item.id} onClick={() => review(item.id, true)}>
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" disabled={busyId === item.id} onClick={() => review(item.id, false)}>
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            ))
          : replaceable.map((field) => {
              const request = pending.find((item) => item.targetFieldId === field.id);
              return (
                <div key={field.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {field.type === "DELIVERY_DOCUMENT" ? "Delivery file" : "Client file"}
                    </p>
                    <p className="mt-1 text-sm font-medium">{field.value || "Shared file"}</p>
                    {request && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                        <Clock3 className="h-3 w-3" /> {request.fileName} · pending admin verification
                      </p>
                    )}
                  </div>
                  <label
                    className={`inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent ${
                      request || busyId === field.id
                        ? "pointer-events-none cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }`}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    {busyId === field.id ? "Uploading..." : request ? "Pending" : "Upload replacement"}
                    <input
                      type="file"
                      className="sr-only"
                      disabled={Boolean(request) || busyId === field.id}
                      onChange={(event) => upload(field, event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              );
            })}
        {previous.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Previous file versions (client and admin only)
            </p>
            {previous.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Previous {item.targetFieldType === "DELIVERY_DOCUMENT" ? "delivery file" : "client file"}
                  </p>
                  <p className="mt-1 text-sm font-medium">{item.fileName}</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href={fileViewUrl(item.url)} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3" /> Preview
                  </a>
                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href={fileDownloadUrl(item.url)} target="_blank" rel="noreferrer" download>
                    <Download className="h-3 w-3" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
