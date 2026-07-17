"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

type BackupUploadResult = {
  success?: boolean;
  error?: string;
  fileName?: string;
  counts?: Record<string, number>;
  message?: string;
};

export function BackupUpload() {
  const [result, setResult] = useState<BackupUploadResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setResult(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/backup", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as BackupUploadResult;
      setResult(data);
    } catch {
      setResult({ error: "Backup file could not be checked" });
    } finally {
      setBusy(false);
    }
  }

  const visibleCounts = result?.counts
    ? Object.entries(result.counts).slice(0, 8)
    : [];

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.currentTarget.value = "";
          }}
        />
        <span className="text-xs text-muted-foreground">
          {busy ? "Checking backup..." : "Upload a JSON backup to check it"}
        </span>
      </div>

      {result?.error && (
        <p className="text-xs text-red-500">{result.error}</p>
      )}

      {result?.success && (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {result.fileName} checked successfully
          </p>
          <p>{result.message}</p>
          {visibleCounts.length > 0 && (
            <div className="grid gap-1 sm:grid-cols-2">
              {visibleCounts.map(([key, count]) => (
                <p key={key}>
                  {key}: {count}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
