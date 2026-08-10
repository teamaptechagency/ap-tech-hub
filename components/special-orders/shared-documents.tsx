"use client";

import { Copy, Download, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fileViewUrl } from "@/lib/file-url";

type SharedDocument = {
  id?: string;
  type: string;
  value: string;
  url?: string;
  audience?: string[];
};

export function SharedDocuments({ fields }: { fields: SharedDocument[] }) {
  const documents = fields.filter(
    (field) =>
      (field.type === "DOCUMENT" || field.type === "DELIVERY_DOCUMENT") &&
      field.audience?.includes("CLIENT")
  );
  if (documents.length === 0) return null;

  async function copyDocument(field: SharedDocument) {
    try {
      await navigator.clipboard.writeText(
        [field.value || "Shared file", field.url ?? ""]
          .filter(Boolean)
          .join("\n\n")
      );
      toast.success("Document copied");
    } catch {
      toast.error("Could not copy. Please allow clipboard access.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Delivery files and documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((field, index) => (
          <div
            key={field.id ?? `${field.type}-${index}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {field.type === "DELIVERY_DOCUMENT" ? "Delivery file" : "Document"}
              </p>
              <p className="mt-1 text-sm font-medium">
                {field.value || "Shared file"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => copyDocument(field)}
              >
                <Copy className="mr-1 h-4 w-4" />
                Copy
              </Button>
              {field.url && (
                <a
                  href={fileViewUrl(field.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
