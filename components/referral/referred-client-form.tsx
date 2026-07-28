"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitReferredClient } from "@/actions/referral.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReferredClientForm() {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    clientName: "",
    companyName: "",
    email: "",
    phone: "",
    country: "",
    service: "",
    budget: "",
    deadline: "",
    note: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await submitReferredClient(form);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Client submitted for review");
      setForm({
        clientName: "",
        companyName: "",
        email: "",
        phone: "",
        country: "",
        service: "",
        budget: "",
        deadline: "",
        note: "",
      });
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Client name</Label>
        <Input value={form.clientName} onChange={(event) => set("clientName")(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Company</Label>
        <Input value={form.companyName} onChange={(event) => set("companyName")(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(event) => set("email")(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(event) => set("phone")(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Country</Label>
        <Input value={form.country} onChange={(event) => set("country")(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Required service</Label>
        <Input value={form.service} onChange={(event) => set("service")(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Estimated budget</Label>
        <Input value={form.budget} onChange={(event) => set("budget")(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Expected deadline</Label>
        <Input value={form.deadline} onChange={(event) => set("deadline")(event.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Project notes</Label>
        <Textarea
          rows={5}
          value={form.note}
          onChange={(event) => set("note")(event.target.value)}
          placeholder="Project description, required features, reference websites, responsibilities, or files to request later."
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit client"}
        </Button>
      </div>
    </form>
  );
}
