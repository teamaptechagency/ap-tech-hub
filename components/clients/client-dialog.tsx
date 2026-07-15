"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createClient,
  updateClient,
} from "@/actions/client.actions";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Currency = "USD" | "EUR" | "GBP" | "BDT";

type ClientData = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  country: string | null;
  currency: string;
  timezone: string;
};

type ClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData | null;
};

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Australia/Sydney",
];

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "BDT"];

function getValidCurrency(currency?: string | null): Currency {
  if (
    currency &&
    CURRENCIES.includes(currency as Currency)
  ) {
    return currency as Currency;
  }

  return "USD";
}

export function ClientDialog({
  open,
  onOpenChange,
  client,
}: ClientDialogProps) {
  const router = useRouter();

  const isEdit = client !== null;

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] =
    useState<Currency>("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [createLogin, setCreateLogin] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setCompanyName(client?.companyName ?? "");
    setContactName(client?.contactName ?? "");
    setEmail(client?.email ?? "");
    setPhone(client?.phone ?? "");
    setCountry(client?.country ?? "");
    setCurrency(getValidCurrency(client?.currency));
    setTimezone(client?.timezone ?? "UTC");
    setCreateLogin(true);

    setError("");
    setLoading(false);
    setTempPassword(null);
  }, [client, open]);

  function handleDialogChange(nextOpen: boolean) {
    if (loading) return;

    if (!nextOpen) {
      setError("");
      setTempPassword(null);
    }

    onOpenChange(nextOpen);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanCompanyName = companyName.trim();
    const cleanContactName = contactName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanCountry = country.trim();

    if (cleanCompanyName.length < 2) {
      setError("Please enter a valid company name.");
      return;
    }

    if (cleanContactName.length < 2) {
      setError("Please enter the contact person's name.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    const data = {
      companyName: cleanCompanyName,
      contactName: cleanContactName,
      email: cleanEmail,
      phone: cleanPhone,
      country: cleanCountry,
      currency,
      timezone,
    };

    setLoading(true);

    try {
      const result = isEdit
        ? await updateClient(client.id, data)
        : await createClient({
            ...data,
            createLogin,
          });

      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        typeof result.error === "string" &&
        result.error
      ) {
        setError(result.error);
        return;
      }

      const generatedPassword =
        !isEdit &&
        result &&
        typeof result === "object" &&
        "password" in result &&
        typeof result.password === "string"
          ? result.password
          : null;

      router.refresh();

      if (generatedPassword) {
        setTempPassword(generatedPassword);
        return;
      }

      onOpenChange(false);
    } catch (submitError) {
      console.error("Failed to save client:", submitError);

      setError(
        "Something went wrong while saving the client. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    setTempPassword(null);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleDialogChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {tempPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>
                Portal login created
              </DialogTitle>

              <DialogDescription>
                Share these credentials with the client. The
                temporary password is shown only once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-md border bg-muted/50 p-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Email
                </p>
                <p className="break-all font-mono text-sm">
                  {email}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Temporary password
                </p>
                <p className="break-all font-mono text-sm font-semibold">
                  {tempPassword}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleDone}
              className="w-full"
            >
              Done
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isEdit
                  ? "Edit client"
                  : "Add new client"}
              </DialogTitle>

              <DialogDescription>
                Manage client details and portal access.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="company-name">
                  Company name
                </Label>

                <Input
                  id="company-name"
                  name="companyName"
                  value={companyName}
                  onChange={(event) =>
                    setCompanyName(event.target.value)
                  }
                  disabled={loading}
                  minLength={2}
                  maxLength={150}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-name">
                  Contact person
                </Label>

                <Input
                  id="contact-name"
                  name="contactName"
                  value={contactName}
                  onChange={(event) =>
                    setContactName(event.target.value)
                  }
                  disabled={loading}
                  minLength={2}
                  maxLength={150}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client-email">
                    Email
                  </Label>

                  <Input
                    id="client-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-phone">
                    Phone / WhatsApp
                  </Label>

                  <Input
                    id="client-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    disabled={loading}
                    autoComplete="tel"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="client-country">
                    Country
                  </Label>

                  <Input
                    id="client-country"
                    name="country"
                    value={country}
                    onChange={(event) =>
                      setCountry(event.target.value)
                    }
                    placeholder="UK"
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-currency">
                    Currency
                  </Label>

                  <Select
                    value={currency}
                    onValueChange={(value) =>
                      setCurrency(value as Currency)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger id="client-currency">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="USD">
                        USD ($)
                      </SelectItem>
                      <SelectItem value="EUR">
                        EUR (€)
                      </SelectItem>
                      <SelectItem value="GBP">
                        GBP (£)
                      </SelectItem>
                      <SelectItem value="BDT">
                        BDT (৳)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-timezone">
                    Timezone
                  </Label>

                  <Select
                    value={timezone}
                    onValueChange={(value) => {
                      if (value !== null) {
                        setTimezone(value);
                      }
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger id="client-timezone">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {TIMEZONES.map((zone) => (
                        <SelectItem
                          key={zone}
                          value={zone}
                        >
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isEdit && (
                <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-muted/40 p-3 text-sm">
                  <Checkbox
                    checked={createLogin}
                    onCheckedChange={(checked) =>
                      setCreateLogin(checked === true)
                    }
                    disabled={loading}
                  />

                  <span>
                    <span className="font-medium">
                      Create portal login now
                    </span>

                    <br />

                    <span className="text-xs text-muted-foreground">
                      A temporary password will be generated
                      and displayed once.
                    </span>
                  </span>
                </label>
              )}

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
                className="w-full"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : isEdit
                    ? "Save changes"
                    : "Create client"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}