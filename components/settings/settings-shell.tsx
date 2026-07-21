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
  updateBrandingSettings,
  updateSettings,
} from "@/actions/settings.actions";

import {
  PaymentMethodSettings,
  type FixedPaymentMethodRow,
} from "@/components/settings/payment-method-settings";
import { BackupUpload } from "@/components/settings/backup-upload";
import { TermsEditor } from "@/components/settings/terms-editor";
import {
  SystemInformation,
  type SystemInformationData,
} from "@/components/settings/system-information";

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
  systemInfo: SystemInformationData;
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

type SettingsSection =
  | "branding"
  | "finance"
  | "skills"
  | "system"
  | "backup"
  | "terms"
  | "team"
  | "payments"
  | "security";

const settingsSections: {
  key: SettingsSection;
  label: string;
  description: string;
}[] = [
  {
    key: "branding",
    label: "Branding",
    description: "Logo, favicon and site name",
  },
  {
    key: "finance",
    label: "Finance",
    description: "Rates, USD and loyalty",
  },
  {
    key: "skills",
    label: "Skills",
    description: "Employee skill library",
  },
  {
    key: "system",
    label: "System",
    description: "Version and rollback record",
  },
  {
    key: "backup",
    label: "Backup",
    description: "Download and upload backup",
  },
  {
    key: "terms",
    label: "Terms",
    description: "Client and employee terms",
  },
  {
    key: "team",
    label: "Team",
    description: "Invite, roles and permissions",
  },
  {
    key: "payments",
    label: "Payments",
    description: "Gateway and receiving details",
  },
  {
    key: "security",
    label: "Security",
    description: "2FA, blacklist and login help",
  },
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

function SplitBrandPreview({ value }: { value: string }) {
  const parts = value.trim().split(/\s+/);
  const accent = parts.pop();
  const lead = parts.join(" ");

  if (!accent || !lead) return <>{value}</>;

  return (
    <>
      {lead} <span className="text-primary">{accent}</span>
    </>
  );
}

export function SettingsShell({
  rates,
  settings,
  skills,
  team,
  paymentMethods,
  templates,
  systemInfo,
}: SettingsShellProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("branding");

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

  const [receivedUsdRate, setReceivedUsdRate] = useState(
    settings["finance.receivedUsdRate"] ?? "118"
  );
  const [receivedEurRate, setReceivedEurRate] = useState(
    settings["finance.receivedEurRate"] ?? "130"
  );
  const [nidRequirement, setNidRequirement] = useState(
    settings["signup.nidRequirement"] ?? "REQUIRED"
  );
  const [nidBusy, setNidBusy] = useState(false);

  const [receivedGbpRate, setReceivedGbpRate] = useState(
    settings["finance.receivedGbpRate"] ?? "152"
  );

  const [specialUsdRate, setSpecialUsdRate] = useState(
    settings["specialOrder.usdRate"] ?? "125"
  );
  const [specialPartnerUsdRate, setSpecialPartnerUsdRate] = useState(
    settings["specialOrder.partnerUsdRate"] ?? "145"
  );


  const [siteName, setSiteName] = useState(
    settings["brand.siteName"] ?? "AP Tech Hub"
  );
  const [hubLogoUrl, setHubLogoUrl] = useState(
    settings["brand.hubLogoUrl"] ?? settings["brand.logoUrl"] ?? ""
  );
  const [publicLogoUrl, setPublicLogoUrl] = useState(
    settings["brand.publicLogoUrl"] ?? settings["brand.logoUrl"] ?? ""
  );
  const [faviconUrl, setFaviconUrl] = useState(
    settings["brand.faviconUrl"] ?? ""
  );
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
  const [uploadingBrandAsset, setUploadingBrandAsset] = useState<
    "hubLogo" | "publicLogo" | "favicon" | null
  >(null);

  async function uploadBrandAsset(
    file: File,
    type: "hubLogo" | "publicLogo" | "favicon"
  ) {
    const fileName = file.name.toLowerCase();
    const isLogoPng =
      (type === "hubLogo" || type === "publicLogo") &&
      file.type === "image/png";
    const isFavicon =
      type === "favicon" &&
      (file.type === "image/png" ||
        file.type === "image/svg+xml" ||
        file.type === "image/webp" ||
        fileName.endsWith(".ico"));

    if (!isLogoPng && !isFavicon) {
      toast.error(
        type === "hubLogo" || type === "publicLogo"
          ? "Logo must be a PNG file"
          : "Favicon must be ICO, PNG, SVG or WebP"
      );
      return;
    }

    setUploadingBrandAsset(type);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", "public");
      formData.append("assetKind", type);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.attachment?.fileUrl) {
        toast.error(data.error ?? "Image could not be uploaded");
        return;
      }

      if (type === "hubLogo") {
        setHubLogoUrl(data.attachment.fileUrl);
      } else if (type === "publicLogo") {
        setPublicLogoUrl(data.attachment.fileUrl);
      } else {
        setFaviconUrl(data.attachment.fileUrl);
      }

      toast.success(
        `${type === "favicon" ? "Favicon" : "Logo"} uploaded. Click Save branding to apply it.`
      );
    } catch (error) {
      console.error("Brand asset upload failed:", error);
      toast.error("Image could not be uploaded");
    } finally {
      setUploadingBrandAsset(null);
    }
  }

  async function saveBranding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);

    try {
      const result = await updateBrandingSettings({
        siteName,
        hubLogoUrl,
        publicLogoUrl,
        faviconUrl,
      });

      const error = getActionError(result);
      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Branding saved");
    } catch (error) {
      console.error("Failed to save branding:", error);
      toast.error("Branding could not be saved");
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // SAVE EXCHANGE RATES
  // ============================================
  async function saveRates() {
    if (busy) return;

    const parsedReceivedUsdRate = Number(receivedUsdRate);
    if (
      !Number.isFinite(parsedReceivedUsdRate) ||
      parsedReceivedUsdRate <= 0
    ) {
      toast.error("Enter a valid received USD rate");
      return;
    }

    const parsedReceivedEurRate = Number(receivedEurRate);
    if (
      !Number.isFinite(parsedReceivedEurRate) ||
      parsedReceivedEurRate <= 0
    ) {
      toast.error("Enter a valid received EUR rate");
      return;
    }

    const parsedReceivedGbpRate = Number(receivedGbpRate);
    if (
      !Number.isFinite(parsedReceivedGbpRate) ||
      parsedReceivedGbpRate <= 0
    ) {
      toast.error("Enter a valid received GBP rate");
      return;
    }

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

      const result = await updateSettings([
        {
          key: "finance.receivedUsdRate",
          value: receivedUsdRate,
        },
        {
          key: "finance.receivedEurRate",
          value: receivedEurRate,
        },
        {
          key: "finance.receivedGbpRate",
          value: receivedGbpRate,
        },
      ]);

      const error = getActionError(result);
      if (error) {
        toast.error(error);
        return;
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
  // SAVE NID SIGNUP REQUIREMENT
  // ============================================
  async function saveNidRequirement(value: string | null) {
    if (!value) return;
    setNidRequirement(value);
    setNidBusy(true);
    try {
      const result = await updateSettings([
        { key: "signup.nidRequirement", value },
      ]);
      const error = getActionError(result);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Signup requirement saved");
    } catch (error) {
      console.error("Failed to save signup requirement:", error);
      toast.error("Could not save signup requirement");
    } finally {
      setNidBusy(false);
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

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {settingsSections.map((section) => {
          const active = activeSection === section.key;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                active
                  ? "border-green-500 bg-green-500/10 text-green-300"
                  : "bg-card hover:bg-muted/40"
              }`}
            >
              <span className="block text-sm font-semibold">
                {section.label}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {section.description}
              </span>
            </button>
          );
        })}
      </div>

      {activeSection === "branding" && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Branding
          </CardTitle>

          <p className="text-xs text-muted-foreground">
            Set the site name, sidebar logo and browser favicon.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={saveBranding} className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="brand-site-name">
                Site name
              </Label>
              <Input
                id="brand-site-name"
                value={siteName}
                onChange={(event) =>
                  setSiteName(event.target.value)
                }
                placeholder="AP Tech Hub"
                disabled={busy}
              />
            </div>

            <div className="space-y-2">
              <Label>Hub logo</Label>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-background">
                    {hubLogoUrl.trim() ? (
                      <img
                        src={hubLogoUrl}
                        alt=""
                        className="h-10 w-10 rounded object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Logo
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="brand-hub-logo-file"
                      className="inline-flex cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      {uploadingBrandAsset === "hubLogo"
                        ? "Uploading..."
                        : hubLogoUrl.trim()
                          ? "Change hub logo"
                          : "Upload hub logo"}
                    </Label>
                    <Input
                      id="brand-hub-logo-file"
                      type="file"
                      accept="image/png,.png"
                      className="hidden"
                      disabled={busy || uploadingBrandAsset !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadBrandAsset(file, "hubLogo");
                        event.currentTarget.value = "";
                      }}
                    />
                    {hubLogoUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => setHubLogoUrl("")}
                        className="ml-2 text-xs text-muted-foreground hover:text-red-500"
                        disabled={busy}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Used inside admin/client/employee/partner hub.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Public logo</Label>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-background">
                    {publicLogoUrl.trim() ? (
                      <img
                        src={publicLogoUrl}
                        alt=""
                        className="h-10 w-10 rounded object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Public
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="brand-public-logo-file"
                      className="inline-flex cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      {uploadingBrandAsset === "publicLogo"
                        ? "Uploading..."
                        : publicLogoUrl.trim()
                          ? "Change public logo"
                          : "Upload public logo"}
                    </Label>
                    <Input
                      id="brand-public-logo-file"
                      type="file"
                      accept="image/png,.png"
                      className="hidden"
                      disabled={busy || uploadingBrandAsset !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadBrandAsset(file, "publicLogo");
                        event.currentTarget.value = "";
                      }}
                    />
                    {publicLogoUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => setPublicLogoUrl("")}
                        className="ml-2 text-xs text-muted-foreground hover:text-red-500"
                        disabled={busy}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Used on the public landing page.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-background">
                    {faviconUrl.trim() ? (
                      <img
                        src={faviconUrl}
                        alt=""
                        className="h-8 w-8 rounded object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Icon
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="brand-favicon-file"
                      className="inline-flex cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      {uploadingBrandAsset === "favicon"
                        ? "Uploading..."
                        : faviconUrl.trim()
                          ? "Change favicon"
                          : "Upload favicon"}
                    </Label>
                    <Input
                      id="brand-favicon-file"
                      type="file"
                      accept="image/png,image/svg+xml,image/webp,.ico,.png,.svg,.webp"
                      className="hidden"
                      disabled={busy || uploadingBrandAsset !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadBrandAsset(file, "favicon");
                        event.currentTarget.value = "";
                      }}
                    />
                    {faviconUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => setFaviconUrl("")}
                        className="ml-2 text-xs text-muted-foreground hover:text-red-500"
                        disabled={busy}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Browser tab icon. ICO, PNG, SVG or WebP works.
              </p>
            </div>

            <div className="flex flex-col gap-2 lg:col-span-3">
              <div className="flex max-w-md items-center gap-2 rounded-md border bg-muted/30 p-2">
                {hubLogoUrl.trim() ? (
                  <img
                    src={hubLogoUrl}
                    alt=""
                    className="h-8 w-8 rounded object-contain"
                  />
                ) : null}
                <span className="min-w-0 truncate text-sm font-semibold">
                  <SplitBrandPreview value={siteName || "AP Tech Hub"} />
                </span>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={busy || uploadingBrandAsset !== null}
                className="w-fit"
              >
                {busy ? "Saving..." : "Save branding"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      {/* Exchange rates and loyalty */}
      {activeSection === "finance" && (
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

            <div className="mt-4 rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-medium">
                Received USD rate
              </p>
              <p className="text-xs text-muted-foreground">
                Used only when recording USD invoice earnings. Example:
                Payoneer/Fiverr/Upwork USD received at BDT 118.
              </p>
              <div className="mt-3 flex max-w-md items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  1 USD =
                </span>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={receivedUsdRate}
                  onChange={(event) =>
                    setReceivedUsdRate(event.target.value)
                  }
                  disabled={busy}
                />
                <span className="text-sm text-muted-foreground">
                  BDT
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-medium">
                Received EUR rate
              </p>
              <p className="text-xs text-muted-foreground">
                Used for Add Job budgets in EUR and for the 20% minimum
                profit check.
              </p>
              <div className="mt-3 flex max-w-md items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  1 EUR =
                </span>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={receivedEurRate}
                  onChange={(event) =>
                    setReceivedEurRate(event.target.value)
                  }
                  disabled={busy}
                />
                <span className="text-sm text-muted-foreground">
                  BDT
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-medium">
                Received GBP rate
              </p>
              <p className="text-xs text-muted-foreground">
                Used for Add Job budgets in GBP and for the 20% minimum
                profit check.
              </p>
              <div className="mt-3 flex max-w-md items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  1 GBP =
                </span>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={receivedGbpRate}
                  onChange={(event) =>
                    setReceivedGbpRate(event.target.value)
                  }
                  disabled={busy}
                />
                <span className="text-sm text-muted-foreground">
                  BDT
                </span>
              </div>
            </div>

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
      )}

      {/* Skills library */}
      {activeSection === "skills" && (
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
      )}

      {/* System information */}
      {activeSection === "system" && (
        <SystemInformation data={systemInfo} />
      )}

      {/* Backup */}
      {activeSection === "backup" && (
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
      )}

      {/* Terms and conditions */}
      {activeSection === "terms" && (
      <TermsEditor
        employeeTerms={
          settings["terms.employee"] ?? ""
        }
        clientTerms={
          settings["terms.client"] ?? ""
        }
        version={settings["terms.version"] ?? "1.0"}
      />
      )}

      {/* Team and roles */}
      {activeSection === "team" && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Worker signup requirements
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Controls whether NID / passport upload is asked for when a
            worker creates their own account on the public signup form.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-sm items-center gap-2">
            <Select
              value={nidRequirement}
              onValueChange={saveNidRequirement}
            >
              <SelectTrigger disabled={nidBusy}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REQUIRED">Required</SelectItem>
                <SelectItem value="OPTIONAL">Optional</SelectItem>
                <SelectItem value="OFF">Off (don't ask)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      )}

      {activeSection === "team" && (
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
      )}

      {activeSection === "payments" && (
      <PaymentMethodSettings
        paymentMethods={paymentMethods}
      />
      )}

      {activeSection === "security" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security center</CardTitle>
            <p className="text-xs text-muted-foreground">
              Review blocked IPs, trusted devices, PIN login activity and help
              requests here.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/settings/blacklist"
              className="block rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <p className="font-medium">Blacklist and login help</p>
              <p className="text-sm text-muted-foreground">
                See blocked IP addresses, unlock users, and review Need Help
                form submissions.
              </p>
            </a>
          </CardContent>
        </Card>
      )}

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