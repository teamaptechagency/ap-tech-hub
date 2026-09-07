"use client";

import { CircleAlert } from "lucide-react";

export function UsdRateInfo() {
  return (
    <details className="group relative inline-flex">
      <summary
        className="inline-flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        aria-label="Why is the USD rate higher?"
      >
        <CircleAlert className="h-3.5 w-3.5" />
      </summary>
      <div className="invisible absolute left-0 top-6 z-50 w-72 rounded-md border bg-popover p-3 text-xs font-normal leading-relaxed text-popover-foreground opacity-0 shadow-md transition-opacity group-open:visible group-open:opacity-100 group-hover:visible group-hover:opacity-100">
        <p className="font-medium">Why can the USD rate be higher?</p>
        <p className="mt-1 text-muted-foreground">
          It includes the original dollar cost, reseller/service cost, and
          Fiverr&apos;s 20% fee. For example, when the original dollar rate is
          BDT 124, the final USD rate can be BDT 160 after these costs are
          included.
        </p>
      </div>
    </details>
  );
}
