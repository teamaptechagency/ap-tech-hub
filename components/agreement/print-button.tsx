"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton({ title }: { title?: string }) {
  function handlePrint() {
    const original = document.title;
    if (title) document.title = title;
    window.print();
    // Restore after the print dialog closes
    setTimeout(() => {
      document.title = original;
    }, 500);
  }

  return (
    <Button onClick={handlePrint}>
      <Printer className="mr-2 h-4 w-4" />
      Print / Save as PDF
    </Button>
  );
}