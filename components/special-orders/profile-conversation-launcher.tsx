"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SpecialOrderDialog } from "@/components/special-orders/special-order-dialog";

type ProfileContext = {
  id: string;
  profileName: string;
  clientId: string | null;
  partnerId: string | null;
  niche: string | null;
  clientRate: number;
  partnerRate: number;
};

type PartnerOption = {
  id: string;
  name: string;
  role: string;
};

export function ProfileConversationLauncher({
  profile,
  partners,
}: {
  profile: ProfileContext;
  partners: PartnerOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create conversation
      </Button>
      {open && (
        <SpecialOrderDialog
          open={open}
          onOpenChange={setOpen}
          profile={profile}
          partners={partners}
        />
      )}
    </>
  );
}
