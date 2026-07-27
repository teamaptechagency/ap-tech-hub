"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitReferralApplication } from "@/actions/referral.actions";

const BUSINESS_TYPES = [
  "Freelancer",
  "Agency",
  "Software company",
  "Marketing company",
  "Reseller",
  "Consultant",
  "Other",
];

const CONTACT_METHODS = ["Email", "Phone", "WhatsApp", "Platform message"];

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-[#101623]">
        {label}
        {required ? <span className="text-[#c6613f]"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[10px] border border-[#e8e3dc] px-4 py-2.5 text-sm outline-none focus:border-[#c6613f]"
      />
      {hint ? <span className="text-xs text-[#6b7280]">{hint}</span> : null}
    </label>
  );
}

export function PartnerApplicationForm() {
  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    email: "",
    phone: "",
    country: "",
    website: "",
    socialProfile: "",
    businessType: "",
    servicesOffered: "",
    industries: "",
    expectedClientType: "",
    expectedReferrals: "",
    preferredContact: "Email",
    note: "",
  });
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await submitReferralApplication(form);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-[#e8e3dc] bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <h2 className="text-xl font-extrabold text-[#101623]">
          Application received
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#6b7280]">
          Thanks — our team will review your details and get in touch to
          discuss terms. Submitting this form does not create a partner
          account; we set that up together once the terms are agreed.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border border-[#e8e3dc] bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          value={form.fullName}
          onChange={set("fullName")}
          required
        />
        <Field
          label="Business or agency name"
          value={form.businessName}
          onChange={set("businessName")}
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          required
        />
        <Field label="Phone" value={form.phone} onChange={set("phone")} />
        <Field label="Country" value={form.country} onChange={set("country")} />
        <Field
          label="Website"
          value={form.website}
          onChange={set("website")}
          placeholder="https://"
        />
        <Field
          label="Social profile"
          value={form.socialProfile}
          onChange={set("socialProfile")}
          placeholder="LinkedIn, Facebook, X..."
        />

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-[#101623]">Business type</span>
          <select
            value={form.businessType}
            onChange={(event) => set("businessType")(event.target.value)}
            className="rounded-[10px] border border-[#e8e3dc] px-4 py-2.5 text-sm outline-none focus:border-[#c6613f]"
          >
            <option value="">Select...</option>
            {BUSINESS_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Services you offer"
          value={form.servicesOffered}
          onChange={set("servicesOffered")}
        />
        <Field
          label="Industries you serve"
          value={form.industries}
          onChange={set("industries")}
        />
        <Field
          label="Expected client type"
          value={form.expectedClientType}
          onChange={set("expectedClientType")}
          placeholder="Startups, local business, e-commerce..."
        />
        <Field
          label="Expected referrals per month"
          value={form.expectedReferrals}
          onChange={set("expectedReferrals")}
          placeholder="1-2, 5+, not sure"
        />

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-[#101623]">
            Preferred contact method
          </span>
          <select
            value={form.preferredContact}
            onChange={(event) => set("preferredContact")(event.target.value)}
            className="rounded-[10px] border border-[#e8e3dc] px-4 py-2.5 text-sm outline-none focus:border-[#c6613f]"
          >
            {CONTACT_METHODS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-[#101623]">Anything else?</span>
        <textarea
          rows={4}
          value={form.note}
          onChange={(event) => set("note")(event.target.value)}
          placeholder="Tell us about your business and the kind of clients you work with."
          className="rounded-[10px] border border-[#e8e3dc] px-4 py-2.5 text-sm outline-none focus:border-[#c6613f]"
        />
      </label>

      <p className="text-xs leading-6 text-[#6b7280]">
        Submitting this form does not create a partner account. Our team
        reviews every application, gets in touch to agree the client discount
        and your commission, and sets the account up afterwards.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[10px] bg-[#c6613f] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#a94e30] disabled:opacity-60"
      >
        {pending ? "Sending..." : "Submit application"}
      </button>
    </form>
  );
}
