"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";

import {
  addPaymentMethod,
  addSkill,
  addTemplate,
  deletePaymentMethod,
  deleteSkill,
  deleteTemplate,
  inviteTeamMember,
  saveUserPermission,
  setUserSkills,
  updateExchangeRate,
  updateSettings,
  updateSystemUpgradeSettings,
} from "@/actions/settings.actions";

import {
  PaymentMethodSettings,
  type FixedPaymentMethodRow,
} from "@/components/settings/payment-method-settings";
import { BackupUpload } from "@/components/settings/backup-upload";
import { TermsEditor } from "@/components/settings/terms-editor";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export type RateRow = {
  code: string;
  rate: number;
  updatedAt: string;
};

export type SkillRow = {
  id: string;
  name: string;
  userCount: number;
};

export type TeamRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  payoutSet: boolean;
  skillIds: string[];
  skillNames: string[];
  permissions: {
    resource: string;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }[];
};

export type PaymentMethodRow = {
  id: string;
  label: string;
  details?: string;
};

export type TemplateRow = {
  id: string;
  title: string;
  priority: string;
};

type SettingsShellProps = {
  rates: RateRow[];
  settings: Record<string, string>;
  skills: SkillRow[];
  team: TeamRow[];
  paymentMethods: FixedPaymentMethodRow[];
  templates: TemplateRow[];
};

type TeamRole =
  | "ADMIN"
  | "CEO"
  | "TEAM_MEMBER"
  | "BUSINESS_PARTNER"
  | "PARTNER_MANAGER";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const priorityBadge: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-600",
};

const permissionResources = [
  { key: "specialOrders", label: "Special orders" },
  { key: "partnerOrders", label: "Partner orders" },
  { key: "invoices", label: "Invoices" },
  { key: "clients", label: "Clients" },
  { key: "jobs", label: "Jobs" },
  { key: "finance", label: "Finance" },
  { key: "settings", label: "Settings" },
];

function getActionError(result: unknown): string | null {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }

  return null;
}

function getActionPassword(result: unknown): string | null {
  if (
    result &&
    typeof result === "object" &&
    "password" in result &&
    typeof result.password === "string"
  ) {
    return result.password;
  }

  return null;
}

export function SettingsShell({
  rates,
  settings,
  skills,
  team,
  paymentMethods,
  templates,
}: SettingsShellProps) {
  // ============================================
  // EXCHANGE RATES
  // ============================================
  const [rateValues, setRateValues] = useState<
    Record<string, string>
  >(
    Object.fromEntries(
      rates.map((rate) => [
        rate.code,
        String(rate.rate),
      ])
    )
  );

  // ============================================
  // LOYALTY
  // ============================================
  const [pointsPer, setPointsPer] = useState(
    settings["loyalty.pointsPer"] ?? "50"
  );

  const [perAmountUsd, setPerAmountUsd] = useState(
    settings["loyalty.perAmountUsd"] ?? "10"
  );

  const [pointsPerDollar, setPointsPerDollar] = useState(
    settings["loyalty.pointsPerDollar"] ?? "100"
  );

  const [specialUsdRate, setSpecialUsdRate] = useState(
    settings["specialOrder.usdRate"] ?? "125"
  );
  const [specialPartnerUsdRate, setSpecialPartnerUsdRate] = useState(
    settings["specialOrder.partnerUsdRate"] ?? "145"
  );

  const [systemVersion, setSystemVersion] = useState(
    settings["system.version"] ?? "1.0.0"
  );
  const [rollbackRetentionMonths, setRollbackRetentionMonths] = useState(
    settings["system.rollbackRetentionMonths"] ?? "2"
  );
  const [upgradeNote, setUpgradeNote] = useState("");

  // ============================================
  // SKILLS
  // ============================================
  const [newSkill, setNewSkill] = useState("");

  // ============================================
  // TEAM
  // ============================================
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] =
    useState<TeamRole>("TEAM_MEMBER");

  const [tempPassword, setTempPassword] =
    useState<string | null>(null);

  const [skillsFor, setSkillsFor] =
    useState<TeamRow | null>(null);

  const [selectedSkills, setSelectedSkills] =
    useState<string[]>([]);
  const [permissionFor, setPermissionFor] =
    useState<TeamRow | null>(null);

  // ============================================
  // LEGACY PAYMENT METHODS
  // Hidden below; fixed payment methods are managed by PaymentMethodSettings.
  // ============================================
  const [pmLabel, setPmLabel] = useState("");
  const [pmDetails, setPmDetails] = useState("");

  // ============================================
  // TEMPLATES
  // ============================================
  const [tplTitle, setTplTitle] = useState("");
  const [tplPriority, setTplPriority] =
    useState<TaskPriority>("MEDIUM");

  const [busy, setBusy] = useState(false);

  // ============================================
  // SAVE EXCHANGE RATES
  // ============================================
  async function saveRates() {
    if (busy) return;

    setBusy(true);

    try {
      for (const code of Object.keys(rateValues)) {
        const result = await updateExchangeRate(
          code,
          rateValues[code]
        );

        const error = getActionError(result);

        if (error) {
          toast.error(error);
          return;
        }
      }

      toast.success("Exchange rates saved");
    } catch (error) {
      console.error("Failed to save exchange rates:", error);
      toast.error("Exchange rates could not be saved");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // SAVE LOYALTY SETTINGS
  // ============================================
  async function saveLoyalty() {
    if (busy) return;

    const earnedPoints = Number(pointsPer);
    const paidAmount = Number(perAmountUsd);
    const exchangePoints = Number(pointsPerDollar);

    if (
      !Number.isFinite(earnedPoints) ||
      earnedPoints <= 0
    ) {
      toast.error("Enter a valid earned point amount");
      return;
    }

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount <= 0
    ) {
      toast.error("Enter a valid paid amount");
      return;
    }

    if (
      !Number.isFinite(exchangePoints) ||
      exchangePoints <= 0
    ) {
      toast.error("Enter a valid exchange point amount");
      return;
    }

    setBusy(true);

    try {
      const result = await updateSettings([
        {
          key: "loyalty.pointsPer",
          value: pointsPer,
        },
        {
          key: "loyalty.perAmountUsd",
          value: perAmountUsd,
        },
        {
          key: "loyalty.pointsPerDollar",
          value: pointsPerDollar,
        },
      ]);

      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Loyalty rules saved");
    } catch (error) {
      console.error("Failed to save loyalty rules:", error);
      toast.error("Loyalty rules could not be saved");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // ADD SKILL
  // ============================================
  async function handleAddSkill(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    const skillName = newSkill.trim();

    if (skillName.length < 2) {
      toast.error("Enter a valid skill name");
      return;
    }

    setBusy(true);

    try {
      const result = await addSkill(skillName);
      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      setNewSkill("");
      toast.success("Skill added");
    } catch (error) {
      console.error("Failed to add skill:", error);
      toast.error("Skill could not be added");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // DELETE SKILL
  // ============================================
  async function handleDeleteSkill(skill: SkillRow) {
    if (busy) return;

    if (skill.userCount > 0) {
      const confirmed = window.confirm(
        `${skill.name} is assigned to ${skill.userCount} user(s). Delete it anyway?`
      );

      if (!confirmed) return;
    }

    setBusy(true);

    try {
      const result = await deleteSkill(skill.id);
      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Skill deleted");
    } catch (error) {
      console.error("Failed to delete skill:", error);
      toast.error("Skill could not be deleted");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // INVITE TEAM MEMBER
  // ============================================
  async function handleInvite(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    const name = invName.trim();
    const email = invEmail.trim().toLowerCase();

    if (name.length < 2) {
      toast.error("Enter the employee's name");
      return;
    }

    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }

    setBusy(true);

    try {
      const result = await inviteTeamMember({
        name,
        email,
        role: invRole,
      });

      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      const password = getActionPassword(result);

      if (!password) {
        toast.error(
          "Member created, but temporary password was not returned"
        );
        return;
      }

      setInvName("");
      setTempPassword(password);

      toast.success("Employee invited");
    } catch (error) {
      console.error("Failed to invite employee:", error);
      toast.error("Employee could not be invited");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // SAVE WORKER SKILLS
  // ============================================
  async function saveSkillsFor() {
    if (!skillsFor || busy) return;

    setBusy(true);

    try {
      const result = await setUserSkills(
        skillsFor.id,
        selectedSkills
      );

      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      setSkillsFor(null);
      setSelectedSkills([]);

      toast.success(
        "Skills updated — find-work matching refreshed"
      );
    } catch (error) {
      console.error("Failed to update employee skills:", error);
      toast.error("Employee skills could not be updated");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // ADD LEGACY PAYMENT METHOD
  // ============================================
  async function handleAddPaymentMethod(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    const label = pmLabel.trim();
    const details = pmDetails.trim();

    if (!label || !details) {
      toast.error("Enter both payment label and details");
      return;
    }

    setBusy(true);

    try {
      const result = await addPaymentMethod({
        label,
        details,
      });

      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      setPmLabel("");
      setPmDetails("");

      toast.success("Payment method added");
    } catch (error) {
      console.error("Failed to add payment method:", error);
      toast.error("Payment method could not be added");
    } finally {
      setBusy(false);
    }
  }

  async function saveSpecialUsdRate() {
    if (busy) return;

    const rate = Number(specialUsdRate);
    const partnerRate = Number(specialPartnerUsdRate);
    if (
      !Number.isFinite(rate) ||
      rate <= 0 ||
      !Number.isFinite(partnerRate) ||
      partnerRate <= 0
    ) {
      toast.error("Enter valid special USD rates");
      return;
    }

    setBusy(true);

    try {
      const result = await updateSettings([
        {
          key: "specialOrder.usdRate",
          value: specialUsdRate,
        },
        {
          key: "specialOrder.partnerUsdRate",
          value: specialPartnerUsdRate,
        },
      ]);

      const error = getActionError(result);
      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Special order USD rate saved");
    } catch (error) {
      console.error("Failed to save special USD rate:", error);
      toast.error("Special USD rate could not be saved");
    } finally {
      setBusy(false);
    }
  }

  async function saveSystemUpgrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);

    try {
      const result = await updateSystemUpgradeSettings({
        targetVersion: systemVersion,
        retentionMonths: rollbackRetentionMonths,
        note: upgradeNote,
      });

      const error = getActionError(result);
      if (error) {
        toast.error(error);
        return;
      }

      setUpgradeNote("");
      toast.success("System upgrade record saved");
    } catch (error) {
      console.error("Failed to save system upgrade settings:", error);
      toast.error("System upgrade record could not be saved");
    } finally {
      setBusy(false);
    }
  }

  async function savePermissionFor(
    member: TeamRow,
    resource: string,
    patch: {
      canCreate?: boolean;
      canRead?: boolean;
      canUpdate?: boolean;
      canDelete?: boolean;
    }
  ) {
    if (busy) return;

    const current =
      member.permissions.find(
        (permission) => permission.resource === resource
      ) ?? {
        resource,
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
      };

    setBusy(true);

    try {
      const result = await saveUserPermission({
        userId: member.id,
        resource,
        canCreate: patch.canCreate ?? current.canCreate,
        canRead: patch.canRead ?? current.canRead,
        canUpdate: patch.canUpdate ?? current.canUpdate,
        canDelete: patch.canDelete ?? current.canDelete,
      });

      const error = getActionError(result);
      if (error) {
        toast.error(error);
        return;
      }

      setPermissionFor((currentMember) => {
        if (!currentMember || currentMember.id !== member.id) {
          return currentMember;
        }

        const updatedPermission = {
          resource,
          canCreate: patch.canCreate ?? current.canCreate,
          canRead: patch.canRead ?? current.canRead,
          canUpdate: patch.canUpdate ?? current.canUpdate,
          canDelete: patch.canDelete ?? current.canDelete,
        };

        return {
          ...currentMember,
          permissions: [
            ...currentMember.permissions.filter(
              (permission) => permission.resource !== resource
            ),
            updatedPermission,
          ],
        };
      });

      toast.success("Permission saved");
    } catch (error) {
      console.error("Failed to save permission:", error);
      toast.error("Permission could not be saved");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // DELETE LEGACY PAYMENT METHOD
  // ============================================
  async function handleDeletePaymentMethod(
    paymentMethod: PaymentMethodRow
  ) {
    if (busy) return;

    const confirmed = window.confirm(
      `Delete the payment method "${paymentMethod.label}"?`
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const result = await deletePaymentMethod(
        paymentMethod.id
      );

      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Payment method deleted");
    } catch (error) {
      console.error(
        "Failed to delete payment method:",
        error
      );

      toast.error("Payment method could not be deleted");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // ADD TEMPLATE
  // ============================================
  async function handleAddTemplate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    const title = tplTitle.trim();

    if (title.length < 2) {
      toast.error("Enter a valid task title");
      return;
    }

    setBusy(true);

    try {
      const result = await addTemplate({
        title,
        priority: tplPriority,
      });

      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      setTplTitle("");
      setTplPriority("MEDIUM");

      toast.success("Template task added");
    } catch (error) {
      console.error("Failed to add template:", error);
      toast.error("Template task could not be added");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // DELETE TEMPLATE
  // ============================================
  async function handleDeleteTemplate(
    template: TemplateRow
  ) {
    if (busy) return;

    const confirmed = window.confirm(
      `Delete the template task "${template.title}"?`
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const result = await deleteTemplate(template.id);
      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Template task deleted");
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Template task could not be deleted");
    } finally {
      setBusy(false);
    }
  }

  const parsedPerAmount = Number.parseInt(
    perAmountUsd,
    10
  );

  const parsedPointsPer = Number.parseInt(pointsPer, 10);

  const loyaltyExample =
    Number.isFinite(parsedPerAmount) &&
    parsedPerAmount > 0 &&
    Number.isFinite(parsedPointsPer) &&
    parsedPointsPer > 0
      ? Math.floor(300 / parsedPerAmount) *
        parsedPointsPer
      : null;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold">
          Settings
        </h1>

        <p className="text-sm text-muted-foreground">
          Manage system-wide rules, team access and default
          settings.
        </p>
      </div>

      {/* Exchange rates and loyalty */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Exchange rates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Currency exchange rates
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              All HR and account totals convert to BDT
              using these rates.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {rates.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No exchange rates are available.
              </p>
            )}

            {rates.map((rate) => (
              <div
                key={rate.code}
                className="flex flex-wrap items-center gap-3"
              >
                <span className="w-24 text-sm font-medium">
                  {rate.code} → BDT
                </span>

                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={rateValues[rate.code] ?? ""}
                  onChange={(event) =>
                    setRateValues((currentValues) => ({
                      ...currentValues,
                      [rate.code]: event.target.value,
                    }))
                  }
                  className="w-32"
                  disabled={busy}
                />

                <span className="text-[10px] text-muted-foreground">
                  Updated{" "}
                  {new Date(
                    rate.updatedAt
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}

            <Button
              type="button"
              size="sm"
              onClick={saveRates}
              disabled={busy || rates.length === 0}
            >
              {busy ? "Saving..." : "Save rates"}
            </Button>

            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-medium">
                Special order USD rates
              </p>
              <p className="text-xs text-muted-foreground">
                Client rate is used on the invoice. Partner rate is used for
                the business partner payout cost.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label className="text-xs">Client invoice rate</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      1 USD =
                    </span>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={specialUsdRate}
                      onChange={(event) =>
                        setSpecialUsdRate(event.target.value)
                      }
                      disabled={busy}
                    />
                    <span className="text-sm text-muted-foreground">
                      BDT
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Partner payout rate</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      1 USD =
                    </span>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={specialPartnerUsdRate}
                      onChange={(event) =>
                        setSpecialPartnerUsdRate(event.target.value)
                      }
                      disabled={busy}
                    />
                    <span className="text-sm text-muted-foreground">
                      BDT
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={saveSpecialUsdRate}
                  disabled={
                    busy ||
                    !specialUsdRate.trim() ||
                    !specialPartnerUsdRate.trim()
                  }
                  className="self-end"
                >
                  Save special rates
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loyalty */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Loyalty points
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              Clients earn points on paid invoices. Point
              exchange requires team approval.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Earn
              </span>

              <Input
                type="number"
                min={1}
                step={1}
                value={pointsPer}
                onChange={(event) =>
                  setPointsPer(event.target.value)
                }
                className="w-20"
                disabled={busy}
              />

              <span className="text-muted-foreground">
                points per $
              </span>

              <Input
                type="number"
                min={1}
                step={1}
                value={perAmountUsd}
                onChange={(event) =>
                  setPerAmountUsd(event.target.value)
                }
                className="w-20"
                disabled={busy}
              />

              <span className="text-muted-foreground">
                paid
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Exchange
              </span>

              <Input
                type="number"
                min={1}
                step={1}
                value={pointsPerDollar}
                onChange={(event) =>
                  setPointsPerDollar(event.target.value)
                }
                className="w-20"
                disabled={busy}
              />

              <span className="text-muted-foreground">
                points = $1
              </span>
            </div>

            <p className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
              Example: A $300 paid invoice gives the client{" "}
              <strong>
                {loyaltyExample === null
                  ? "—"
                  : `${loyaltyExample.toLocaleString()} points`}
              </strong>
              .
            </p>

            <Button
              type="button"
              size="sm"
              onClick={saveLoyalty}
              disabled={busy}
            >
              {busy
                ? "Saving..."
                : "Save loyalty rules"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Skills library */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Skills library
          </CardTitle>

          <p className="text-xs text-muted-foreground">
            Employees receive skills from this master list.
            Open jobs use the skills for marketplace
            matching.
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No skills have been added yet.
              </p>
            )}

            {skills.map((skill) => (
              <span
                key={skill.id}
                className="group inline-flex items-center gap-1.5 rounded-full border bg-primary/5 px-3 py-1 text-sm"
              >
                {skill.name}

                <span className="text-xs text-muted-foreground">
                  · {skill.userCount}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteSkill(skill)
                  }
                  disabled={busy}
                  aria-label={`Delete ${skill.name}`}
                  className="invisible text-muted-foreground transition-colors hover:text-red-500 disabled:opacity-50 group-hover:visible"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <form
            onSubmit={handleAddSkill}
            className="flex max-w-sm gap-2"
          >
            <Input
              value={newSkill}
              onChange={(event) =>
                setNewSkill(event.target.value)
              }
              placeholder="New skill name..."
              disabled={busy}
            />

            <Button
              type="submit"
              size="sm"
              disabled={busy || !newSkill.trim()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* System upgrade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            System upgrade
          </CardTitle>

          <p className="text-xs text-muted-foreground">
            Record app upgrades, block downgrades, and keep rollback
            points before adding new features.
          </p>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={saveSystemUpgrade}
            className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-2">
              <Label htmlFor="system-version">
                Current / next version
              </Label>
              <Input
                id="system-version"
                value={systemVersion}
                onChange={(event) =>
                  setSystemVersion(event.target.value)
                }
                placeholder="1.0.0"
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                Same version can be recorded again. Downgrade is blocked.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Rollback data retention</Label>
              <Select
                value={rollbackRetentionMonths}
                onValueChange={(value) => {
                  if (value) setRollbackRetentionMonths(value);
                }}
                disabled={busy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 month</SelectItem>
                  <SelectItem value="2">2 months</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Old rollback files are not removed automatically here.
              </p>
            </div>

            <div className="flex flex-col gap-2 lg:min-w-48">
              <a href="/api/backup?type=rollback" download>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Download rollback point
                </Button>
              </a>
              <Button type="submit" size="sm" disabled={busy}>
                Save upgrade record
              </Button>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="upgrade-note">
                Upgrade note
              </Label>
              <Input
                id="upgrade-note"
                value={upgradeNote}
                onChange={(event) =>
                  setUpgradeNote(event.target.value)
                }
                placeholder="What changed in this update?"
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                Last update:{" "}
                {settings["system.lastUpgradeAt"]
                  ? new Date(
                      settings["system.lastUpgradeAt"]
                    ).toLocaleString()
                  : "not recorded"}{" "}
                {settings["system.lastUpgradeBy"]
                  ? `by ${settings["system.lastUpgradeBy"]}`
                  : ""}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Backup
          </CardTitle>

          <p className="text-xs text-muted-foreground">
            Download every database table as a JSON file.
            Keep secure copies on Google Drive or an external
            disk.
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
          <a href="/api/backup" download>
            <Button
              type="button"
              size="sm"
              variant="outline"
            >
              Download full backup
            </Button>
          </a>
          <BackupUpload />
          </div>
        </CardContent>
      </Card>

      {/* Terms and conditions */}
      <TermsEditor
        employeeTerms={
          settings["terms.employee"] ?? ""
        }
        clientTerms={
          settings["terms.client"] ?? ""
        }
        version={settings["terms.version"] ?? "1.0"}
      />

      {/* Team and roles */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base">
              Team & roles
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              Employee skills set here control marketplace
              application matching.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Invite member
          </Button>
        </CardHeader>

        <CardContent className="divide-y px-4 pb-2 pt-0">
          {team.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No employees found.
            </p>
          )}

          {team.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {member.name}{" "}
                  <Badge
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {member.role
                      .replaceAll("_", " ")
                      .toLowerCase()}
                  </Badge>
                </p>

                <p className="text-xs text-muted-foreground">
                  {member.email}

                  {(member.role === "TEAM_MEMBER" ||
                    member.role === "BUSINESS_PARTNER") && (
                    <>
                      {" · skills: "}
                      {member.skillNames.length > 0
                        ? member.skillNames.join(", ")
                        : "none set"}

                      {" · payout: "}

                      {member.payoutSet ? (
                        <span className="text-green-600">
                          set ✓
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          not set ⚠
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(member.role === "TEAM_MEMBER" ||
                  member.role === "BUSINESS_PARTNER") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setSkillsFor(member);
                      setSelectedSkills(member.skillIds);
                    }}
                  >
                    Edit skills
                  </Button>
                )}

                {[
                  "ADMIN",
                  "CEO",
                  "CLIENT_MANAGER",
                  "PARTNER_MANAGER",
                ].includes(member.role) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setPermissionFor(member)}
                  >
                    Permissions
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <PaymentMethodSettings
        paymentMethods={paymentMethods}
      />

      {/* Payment methods and templates */}
      <div className="hidden grid gap-4 lg:grid-cols-2">
        {/* Payment methods */}
        <Card className="hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Default payment methods
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              These payment details are shown to clients on
              invoices.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {paymentMethods.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No payment methods have been added.
              </p>
            )}

            {paymentMethods.map((paymentMethod) => (
              <div
                key={paymentMethod.id}
                className="group flex items-start justify-between gap-3 rounded-md border p-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {paymentMethod.label}
                  </p>

                  <p className="break-words font-mono text-xs text-muted-foreground">
                    {paymentMethod.details}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleDeletePaymentMethod(
                      paymentMethod
                    )
                  }
                  disabled={busy}
                  aria-label={`Delete ${paymentMethod.label}`}
                  className="invisible shrink-0 text-muted-foreground transition-colors hover:text-red-500 disabled:opacity-50 group-hover:visible"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <form
              onSubmit={handleAddPaymentMethod}
              className="space-y-2"
            >
              <Input
                value={pmLabel}
                onChange={(event) =>
                  setPmLabel(event.target.value)
                }
                placeholder="Label — e.g. Bank transfer (UK)"
                disabled={busy}
              />

              <Input
                value={pmDetails}
                onChange={(event) =>
                  setPmDetails(event.target.value)
                }
                placeholder="Details — e.g. Sort 04-00-04 · Account 12345678"
                disabled={busy}
              />

              <Button
                type="submit"
                size="sm"
                disabled={
                  busy ||
                  !pmLabel.trim() ||
                  !pmDetails.trim()
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add method
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Week templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Week template tasks
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              These tasks are automatically added to every
              new week of monthly jobs.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {templates.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No template tasks yet.
              </p>
            )}

            {templates.map((template) => (
              <div
                key={template.id}
                className="group flex items-center justify-between gap-3 rounded-md border p-2.5"
              >
                <p className="text-sm">
                  {template.title}{" "}

                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${
                      priorityBadge[template.priority] ??
                      ""
                    }`}
                  >
                    {template.priority.toLowerCase()}
                  </Badge>
                </p>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteTemplate(template)
                  }
                  disabled={busy}
                  aria-label={`Delete ${template.title}`}
                  className="invisible shrink-0 text-muted-foreground transition-colors hover:text-red-500 disabled:opacity-50 group-hover:visible"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <form
              onSubmit={handleAddTemplate}
              className="flex flex-wrap gap-2"
            >
              <Input
                value={tplTitle}
                onChange={(event) =>
                  setTplTitle(event.target.value)
                }
                placeholder="Task title..."
                className="min-w-40 flex-1"
                disabled={busy}
              />

              <Select
                value={tplPriority}
                onValueChange={(value) => {
                  if (value !== null) {
                    setTplPriority(
                      value as TaskPriority
                    );
                  }
                }}
                disabled={busy}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="LOW">
                    Low
                  </SelectItem>

                  <SelectItem value="MEDIUM">
                    Medium
                  </SelectItem>

                  <SelectItem value="HIGH">
                    High
                  </SelectItem>

                  <SelectItem value="URGENT">
                    Urgent
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="submit"
                size="sm"
                disabled={busy || !tplTitle.trim()}
              >
                Add
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Invite member dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          if (busy) return;

          setInviteOpen(open);

          if (!open) {
            setTempPassword(null);
            setInvName("");
            setInvEmail("");
            setInvRole("TEAM_MEMBER");
          }
        }}
      >
        <DialogContent>
          {tempPassword ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Member invited
                </DialogTitle>

                <DialogDescription>
                  Share these credentials securely. The
                  temporary password is shown only once.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 rounded-md border bg-muted/50 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Email
                  </p>

                  <p className="break-all font-mono text-sm">
                    {invEmail}
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
                onClick={() => {
                  setInviteOpen(false);
                  setTempPassword(null);
                  setInvEmail("");
                  setInvRole("TEAM_MEMBER");
                }}
              >
                Done
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  Invite employee
                </DialogTitle>

                <DialogDescription>
                  A temporary password will be generated and
                  displayed once.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleInvite}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="invite-name">
                    Name
                  </Label>

                  <Input
                    id="invite-name"
                    value={invName}
                    onChange={(event) =>
                      setInvName(event.target.value)
                    }
                    disabled={busy}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-email">
                    Email
                  </Label>

                  <Input
                    id="invite-email"
                    type="email"
                    value={invEmail}
                    onChange={(event) =>
                      setInvEmail(event.target.value)
                    }
                    disabled={busy}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>

                  <Select
                    value={invRole}
                    onValueChange={(value) => {
                      if (value !== null) {
                        setInvRole(value as TeamRole);
                      }
                    }}
                    disabled={busy}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="TEAM_MEMBER">
                        Employee
                      </SelectItem>

                      <SelectItem value="BUSINESS_PARTNER">
                        Business partner
                      </SelectItem>

                      <SelectItem value="PARTNER_MANAGER">
                        Partner manager
                      </SelectItem>

                      <SelectItem value="ADMIN">
                        Admin
                      </SelectItem>

                      <SelectItem value="CEO">
                        CEO
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={busy}
                >
                  {busy ? "Inviting..." : "Invite"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Employee skills dialog */}
      <Dialog
        open={skillsFor !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setSkillsFor(null);
            setSelectedSkills([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Skills — {skillsFor?.name}
            </DialogTitle>

            <DialogDescription>
              These skills control which open jobs this team
              member can apply to.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No skills are available.
              </p>
            )}

            {skills.map((skill) => {
              const selected =
                selectedSkills.includes(skill.id);

              return (
                <button
                  key={skill.id}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setSelectedSkills(
                      (currentSkills) =>
                        selected
                          ? currentSkills.filter(
                              (id) => id !== skill.id
                            )
                          : [
                              ...currentSkills,
                              skill.id,
                            ]
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                    selected
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  {skill.name}
                  {selected && " ✓"}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={saveSkillsFor}
            disabled={busy || !skillsFor}
          >
            {busy ? "Saving..." : "Save skills"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={permissionFor !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPermissionFor(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Permissions - {permissionFor?.name}
            </DialogTitle>
            <DialogDescription>
              Main admins can set module-wise CRUD access for managers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {permissionResources.map((resource) => {
              const permission =
                permissionFor?.permissions.find(
                  (item) => item.resource === resource.key
                ) ?? {
                  resource: resource.key,
                  canCreate: false,
                  canRead: true,
                  canUpdate: false,
                  canDelete: false,
                };

              return (
                <div
                  key={resource.key}
                  className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-[1fr_repeat(4,auto)]"
                >
                  <p className="font-medium">{resource.label}</p>
                  {(
                    [
                      ["canCreate", "Create"],
                      ["canRead", "Read"],
                      ["canUpdate", "Update"],
                      ["canDelete", "Delete"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Checkbox
                        checked={permission[key]}
                        disabled={!permissionFor || busy}
                        onCheckedChange={(checked) => {
                          if (!permissionFor) return;
                          void savePermissionFor(
                            permissionFor,
                            resource.key,
                            { [key]: checked === true }
                          );
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
