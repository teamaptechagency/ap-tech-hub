"use client";

import { useState } from "react";
import {
  approvePointExchange,
  rejectPointExchange,
} from "@/actions/client.actions";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

export function ExchangeBanner({
  requestId,
  points,
  dollars,
}: {
  requestId: string;
  points: number;
  dollars: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handle(action: "approve" | "reject") {
    setError("");
    setBusy(true);
    const result =
      action === "approve"
        ? await approvePointExchange(requestId)
        : await rejectPointExchange(requestId);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-800">
        <Star className="mr-1 inline h-4 w-4" />
        <span className="font-medium">Point exchange request:</span> client
        wants to sell {points.toLocaleString()} points → ${dollars.toFixed(2)}{" "}
        balance credit
        {error && <span className="ml-2 text-red-500">{error}</span>}
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => handle("approve")} disabled={busy}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handle("reject")}
          disabled={busy}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}