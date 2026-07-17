"use client";

import { useState } from "react";
import { toast } from "sonner";

import { submitJobRequest } from "@/actions/client-portal.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export type ClientRequestServiceOption = {
  id: string;
  title: string;
  category: string;
  description: string;
};

export function JobRequestForm({
  services = [],
}: {
  services?: ClientRequestServiceOption[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetHint, setBudgetHint] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(
    services[0]?.id ?? "custom"
  );
  const [customService, setCustomService] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedService = services.find(
    (service) => service.id === selectedServiceId
  );

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanBudgetHint = budgetHint.trim();

    setError("");

    if (cleanTitle.length < 3) {
      const message = "Please enter a clear job title.";
      setError(message);
      toast.error(message);
      return;
    }

    if (cleanDescription.length < 10) {
      const message =
        "Please provide at least 10 characters in the job details.";
      setError(message);
      toast.error(message);
      return;
    }

    setBusy(true);

    try {
      const result = await submitJobRequest({
        title: cleanTitle,
        description: cleanDescription,
        budgetHint: cleanBudgetHint,
        serviceName: selectedService?.title ?? "",
        serviceCategory: selectedService?.category ?? "",
        customService:
          selectedServiceId === "custom" ? customService.trim() : "",
      });

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setTitle("");
      setDescription("");
      setBudgetHint("");
      setCustomService("");
      setSelectedServiceId(services[0]?.id ?? "custom");
      setError("");

      toast.success("Your job request has been sent successfully.");
    } catch (error) {
      console.error("Failed to submit job request:", error);

      const message =
        "Something went wrong while sending your request.";

      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-3">
            <div>
              <Label>Choose a service</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Select from our public services or choose custom if your need is different.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    if (!title.trim()) setTitle(service.title);
                  }}
                  disabled={busy}
                  className={`rounded-xl border p-4 text-left transition hover:border-primary ${
                    selectedServiceId === service.id
                      ? "border-primary bg-primary/10"
                      : "bg-background"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">
                    {service.category || "Service"}
                  </p>
                  <p className="mt-1 font-semibold">{service.title}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {service.description}
                  </p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedServiceId("custom")}
                disabled={busy}
                className={`rounded-xl border p-4 text-left transition hover:border-primary ${
                  selectedServiceId === "custom"
                    ? "border-primary bg-primary/10"
                    : "bg-background"
                }`}
              >
                <p className="text-xs text-muted-foreground">Custom</p>
                <p className="mt-1 font-semibold">Something else</p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  Tell us what you need if it does not match a listed service.
                </p>
              </button>
            </div>
            {selectedServiceId === "custom" && (
              <Input
                value={customService}
                onChange={(event) => setCustomService(event.target.value)}
                placeholder="e.g. Marketplace account audit"
                maxLength={120}
                disabled={busy}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-title">
              What do you need?
            </Label>

            <Input
              id="request-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Landing page for our new product"
              minLength={3}
              maxLength={150}
              disabled={busy}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-description">
              Details
            </Label>

            <Textarea
              id="request-description"
              name="description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={5}
              placeholder="Pages needed, deadline expectations, references..."
              minLength={10}
              maxLength={5000}
              disabled={busy}
              required
            />

            <p className="text-right text-xs text-muted-foreground">
              {description.length}/5000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-budget">
              Budget hint{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>

            <Input
              id="request-budget"
              name="budgetHint"
              type="text"
              value={budgetHint}
              onChange={(event) =>
                setBudgetHint(event.target.value)
              }
              placeholder="e.g. Around $500"
              maxLength={100}
              disabled={busy}
              autoComplete="off"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={
              busy ||
              title.trim().length < 3 ||
              description.trim().length < 10
            }
          >
            {busy ? "Sending request..." : "Send request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
