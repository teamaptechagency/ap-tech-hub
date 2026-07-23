"use client";

import { useState } from "react";
import {
  changePassword,
  requestEmailChange,
  requestSecurityVerificationCode,
  enableAuthenticator,
  setTwoFactorEnabled,
  setupAuthenticator,
  updatePortfolio,
  updateProfile,
} from "@/actions/profile.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fileViewUrl } from "@/lib/file-url";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const TIMEZONES = [
  "Asia/Dhaka",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "Asia/Dubai",
];

type PendingChange = {
  id: string;
  type: string;
  createdAt: string;
};

type LoginDevice = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
};

type ProfileTab = "personal" | "portfolio" | "security" | "payment";
type TwoFactorMethod = "EMAIL" | "WHATSAPP" | "AUTHENTICATOR";
type PortfolioItem = {
  title: string;
  thumbnailUrl: string;
  linkUrl: string;
  brief: string;
  galleryUrls?: string[];
};

function portfolioItemsToLines(items: PortfolioItem[]) {
  return items
    .map((item) =>
      [item.title, item.thumbnailUrl, item.linkUrl, item.brief]
        .map((value) => value.trim())
        .join(" | ")
    )
    .join("\n");
}

function visualPortfolioItemsToLines(items: PortfolioItem[]) {
  return items
    .map((item) =>
      [
        item.title,
        item.thumbnailUrl,
        item.brief,
        (item.galleryUrls ?? []).join(", "),
      ]
        .map((value) => value.trim())
        .join(" | ")
    )
    .join("\n");
}

function parseTwoFactorMethods(value: string) {
  return value
    .split(",")
    .map((method) => method.trim().toUpperCase())
    .filter((method): method is TwoFactorMethod =>
      ["EMAIL", "WHATSAPP", "AUTHENTICATOR"].includes(method)
    );
}

export function ProfileForm({
  name,
  email,
  phone,
  address,
  dateOfBirth,
  nidNumber,
  nidUrl,
  photoUrl,
  identityStatus,
  emergencyContact,
  bio,
  gender,
  profession,
  payoutMethod,
  payoutDetails,
  timezone,
  twoFactorEnabled,
  twoFactorMethod,
  withdrawBlockedUntil,
  pendingChanges = [],
  loginDevices = [],
  showPayment = true,
  showPortfolio = true,
  portfolio = {
    headline: "",
    summary: "",
    portfolioUrl: "",
    figmaUrl: "",
    liveUrl: "",
    workSamples: [],
    webProjects: [],
    designProjects: [],
    graphicsProjects: [],
    architectureProjects: [],
    visible: false,
  },
}: {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  nidNumber: string;
  nidUrl: string;
  photoUrl: string;
  identityStatus: string;
  emergencyContact: string;
  bio: string;
  gender: string;
  profession: string;
  payoutMethod: string;
  payoutDetails: string;
  timezone: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  withdrawBlockedUntil: string | null;
  pendingChanges?: PendingChange[];
  loginDevices?: LoginDevice[];
  showPayment?: boolean;
  showPortfolio?: boolean;
  portfolio?: {
    headline: string;
    summary: string;
    portfolioUrl: string;
    figmaUrl: string;
    liveUrl: string;
    workSamples: string[];
    webProjects?: PortfolioItem[];
    designProjects?: PortfolioItem[];
    graphicsProjects?: PortfolioItem[];
    architectureProjects?: PortfolioItem[];
    visible: boolean;
  };
}) {
  const [fullName, setFullName] = useState(name);
  const [nextEmail, setNextEmail] = useState(email);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [addressValue, setAddressValue] = useState(address);
  const [dobValue, setDobValue] = useState(dateOfBirth);
  const [nidNumberValue, setNidNumberValue] = useState(nidNumber);
  const [nidUrlValue, setNidUrlValue] = useState(nidUrl);
  const [photoUrlValue, setPhotoUrlValue] = useState(photoUrl);
  const [emergencyValue, setEmergencyValue] = useState(emergencyContact);
  const [bioValue, setBioValue] = useState(bio);
  const [genderValue, setGenderValue] = useState(gender || "OTHER");
  const [professionValue, setProfessionValue] = useState(profession);
  const [method, setMethod] = useState(payoutMethod || "bKash");
  const [details, setDetails] = useState(payoutDetails);
  const [tz, setTz] = useState(timezone);
  const [twoFactorMethods, setTwoFactorMethods] = useState<TwoFactorMethod[]>(
    twoFactorEnabled ? parseTwoFactorMethods(twoFactorMethod || "EMAIL") : []
  );
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [uploading, setUploading] = useState<"nid" | "photo" | null>(null);
  const [authSecret, setAuthSecret] = useState("");
  const [authUrl, setAuthUrl] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwCode, setPwCode] = useState("");
  const [pwCodeSending, setPwCodeSending] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [twoFactorOffPassword, setTwoFactorOffPassword] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [portfolioHeadline, setPortfolioHeadline] = useState(portfolio.headline);
  const [portfolioSummary, setPortfolioSummary] = useState(portfolio.summary);
  const [portfolioUrl, setPortfolioUrl] = useState(portfolio.portfolioUrl);
  const [portfolioFigmaUrl, setPortfolioFigmaUrl] = useState(portfolio.figmaUrl);
  const [portfolioLiveUrl, setPortfolioLiveUrl] = useState(portfolio.liveUrl);
  const [portfolioWork, setPortfolioWork] = useState(
    portfolio.workSamples.join("\n")
  );
  const [portfolioWebProjects, setPortfolioWebProjects] = useState(
    portfolioItemsToLines(portfolio.webProjects ?? [])
  );
  const [portfolioDesignProjects, setPortfolioDesignProjects] = useState(
    portfolioItemsToLines(portfolio.designProjects ?? [])
  );
  const [portfolioGraphicsProjects, setPortfolioGraphicsProjects] = useState(
    visualPortfolioItemsToLines(portfolio.graphicsProjects ?? [])
  );
  const [portfolioArchitectureProjects, setPortfolioArchitectureProjects] =
    useState(visualPortfolioItemsToLines(portfolio.architectureProjects ?? []));
  const [portfolioVisible, setPortfolioVisible] = useState(portfolio.visible);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const authQrUrl = authUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(authUrl)}`
    : "";
  const securityTwoFactorMethods = twoFactorMethods.filter(
    (method) => method !== "EMAIL"
  );
  const twoFactor = securityTwoFactorMethods.length > 0;
  const hasWhatsApp2fa = twoFactorMethods.includes("WHATSAPP");
  const hasAuthenticator2fa = twoFactorMethods.includes("AUTHENTICATOR");
  const methodText = twoFactor
    ? securityTwoFactorMethods
        .map((method) =>
          method === "AUTHENTICATOR"
            ? "authenticator"
            : method.toLowerCase()
        )
        .join(", ")
    : "off";

  function applyTwoFactorMethod(method: TwoFactorMethod, enabled: boolean) {
    setTwoFactorMethods((currentMethods) => {
      const nextMethods = new Set(currentMethods);
      if (enabled) nextMethods.add(method);
      else nextMethods.delete(method);
      return ["EMAIL", "WHATSAPP", "AUTHENTICATOR"].filter((item) =>
        nextMethods.has(item as TwoFactorMethod)
      ) as TwoFactorMethod[];
    });
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const result = await updateProfile({
      name: fullName,
      phone: phoneValue,
      address: addressValue,
      dateOfBirth: dobValue,
      nidNumber: nidNumberValue,
      nidUrl: nidUrlValue,
      photoUrl: photoUrlValue,
      emergencyContact: emergencyValue,
      bio: bioValue,
      gender: genderValue,
      profession: professionValue,
      payoutMethod: method,
      payoutDetails: details,
      timezone: tz,
    });
    setBusy(false);
    if (result.error) return toast.error(result.error);
    toast.success(result.review ?? "Profile saved");
  }

  async function saveEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailBusy(true);
    const result = await requestEmailChange(nextEmail);
    setEmailBusy(false);
    if (result.error) return toast.error(result.error);
    toast.success(result.review ?? "Email change requested");
  }

  async function setTwoFactorModeEnabled(method: "WHATSAPP") {
    setSecurityBusy(true);
    const result = await setTwoFactorEnabled(true, method);
    setSecurityBusy(false);
    if (result.error) return toast.error(result.error);
    applyTwoFactorMethod(method, true);
    toast.success(
      "WhatsApp 2-factor login enabled"
    );
  }

  async function turnOffTwoFactor(method: TwoFactorMethod) {
    if (!twoFactorOffPassword) {
      toast.error("Enter your current password to turn off 2FA");
      return;
    }
    setSecurityBusy(true);
    const result = await setTwoFactorEnabled(
      false,
      method,
      twoFactorOffPassword
    );
    setSecurityBusy(false);
    if (result.error) return toast.error(result.error);
    setTwoFactorOffPassword("");
    applyTwoFactorMethod(method, false);
    toast.success(`${method === "AUTHENTICATOR" ? "Authenticator" : method} 2-factor login disabled`);
  }

  async function toggleWhatsAppTwoFactor() {
    if (hasWhatsApp2fa) {
      await turnOffTwoFactor("WHATSAPP");
      return;
    }
    await setTwoFactorModeEnabled("WHATSAPP");
  }

  async function toggleAuthenticatorTwoFactor() {
    if (hasAuthenticator2fa) {
      await turnOffTwoFactor("AUTHENTICATOR");
      return;
    }
    await startAuthenticator();
  }

  async function startAuthenticator() {
    setSecurityBusy(true);
    const result = await setupAuthenticator();
    setSecurityBusy(false);
    if (result.error) return toast.error(result.error);
    setAuthSecret(result.secret ?? "");
    setAuthUrl(result.otpAuthUrl ?? "");
    toast.success("Authenticator secret created");
  }

  async function confirmAuthenticator() {
    setSecurityBusy(true);
    const result = await enableAuthenticator(authCode);
    setSecurityBusy(false);
    if (result.error) return toast.error(result.error);
    applyTwoFactorMethod("AUTHENTICATOR", true);
    setAuthCode("");
    toast.success("Authenticator 2-factor enabled");
  }

  async function uploadIdentityFile(file: File, type: "nid" | "photo") {
    setUploading(type);
    const formData = new FormData();
    formData.append("file", file);
    if (type === "photo") {
      formData.append("visibility", "public");
      formData.append("assetKind", "profile-photo");
    }
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setUploading(null);
    if (!response.ok || !data.attachment?.fileUrl) {
      toast.error(data.error ?? "Upload failed");
      return;
    }
    if (type === "nid") setNidUrlValue(data.attachment.fileUrl);
    else setPhotoUrlValue(data.attachment.fileUrl);
    toast.success("File uploaded. Save profile to submit for review.");
  }

  const mobilePayout = ["bKash", "Nagad"].includes(method);
  const phonePending = pendingChanges.filter((change) => change.type === "PHONE");
  const payoutPending = pendingChanges.filter((change) => change.type === "PAYOUT");
  const emailPending = pendingChanges.filter((change) => change.type === "EMAIL");

  async function sendPasswordChangeCode() {
    setPwCodeSending(true);
    const result = await requestSecurityVerificationCode();
    setPwCodeSending(false);
    if (result.error) return toast.error(result.error);
    toast.success(result.message ?? "Code sent");
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwBusy(true);
    const result = await changePassword({ current, next, code: pwCode });
    setPwBusy(false);
    if (result.error) return toast.error(result.error);
    setCurrent("");
    setNext("");
    setPwCode("");
    toast.success("Password changed");
  }

  async function savePortfolio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPortfolioBusy(true);
    const result = await updatePortfolio({
      headline: portfolioHeadline,
      summary: portfolioSummary,
      portfolioUrl,
      figmaUrl: portfolioFigmaUrl,
      liveUrl: portfolioLiveUrl,
      workSamples: portfolioWork,
      webProjects: portfolioWebProjects,
      designProjects: portfolioDesignProjects,
      graphicsProjects: portfolioGraphicsProjects,
      architectureProjects: portfolioArchitectureProjects,
      visible: portfolioVisible,
    });
    setPortfolioBusy(false);
    if (result.error) return toast.error(result.error);
    toast.success("Portfolio saved");
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-1">
        <ProfileTabButton
          active={activeTab === "personal"}
          onClick={() => setActiveTab("personal")}
        >
          Personal details
        </ProfileTabButton>
        {showPortfolio && (
          <ProfileTabButton
            active={activeTab === "portfolio"}
            onClick={() => setActiveTab("portfolio")}
          >
            Portfolio
          </ProfileTabButton>
        )}
        <ProfileTabButton
          active={activeTab === "security"}
          onClick={() => setActiveTab("security")}
        >
          Security
        </ProfileTabButton>
        {showPayment && (
          <ProfileTabButton
            active={activeTab === "payment"}
            onClick={() => setActiveTab("payment")}
          >
            Payment
          </ProfileTabButton>
        )}
      </div>

      {activeTab === "personal" && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" id="pfName" value={fullName} onChange={setFullName} required />
              <Field label="Phone number" id="pfPhone" value={phoneValue} onChange={setPhoneValue} />
              <Field label="Profession" id="pfProfession" value={professionValue} onChange={setProfessionValue} />
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={genderValue}
                  onValueChange={(value) => value && setGenderValue(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="Date of birth" id="pfDob" value={dobValue} onChange={setDobValue} type="date" />
              <Field label="Emergency contact" id="pfEmergency" value={emergencyValue} onChange={setEmergencyValue} />
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Identity verification</p>
                  <p className="text-xs text-muted-foreground">
                    Profile photo, NID number, DOB and NID copy are reviewed by admin.
                  </p>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {identityStatus.toLowerCase()}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="NID number" id="pfNidNumber" value={nidNumberValue} onChange={setNidNumberValue} />
                <UploadBox
                  label="Profile photo"
                  uploaded={Boolean(photoUrlValue)}
                  fileUrl={photoUrlValue}
                  uploading={uploading === "photo"}
                  accept="image/*"
                  onFile={(file) => uploadIdentityFile(file, "photo")}
                  onOpen={() => photoUrlValue && window.open(photoUrlValue, "_blank")}
                />
                <UploadBox
                  label="NID copy"
                  uploaded={Boolean(nidUrlValue)}
                  fileUrl={nidUrlValue}
                  uploading={uploading === "nid"}
                  accept="image/*,application/pdf"
                  onFile={(file) => uploadIdentityFile(file, "nid")}
                  onOpen={() => nidUrlValue && window.open(fileViewUrl(nidUrlValue), "_blank")}
                />
              </div>
            </div>

            <Field label="Address" id="pfAddress" value={addressValue} onChange={setAddressValue} />
            <Field label="Short bio / note" id="pfBio" value={bioValue} onChange={setBioValue} />

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={tz} onValueChange={(value) => value && setTz(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving..." : "Save profile"}
            </Button>

            <p className="text-[10px] text-muted-foreground">
              Phone changes go under review for non-admin users.
            </p>

            {phonePending.length > 0 &&
              withdrawBlockedUntil &&
              new Date(withdrawBlockedUntil) > new Date() && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700">
                Verification wait until{" "}
                {new Date(withdrawBlockedUntil).toLocaleString("en-GB")}.
                You can still submit a withdrawal request.
              </p>
            )}

            {phonePending.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="font-medium">Pending review</p>
                {phonePending.map((change) => (
                  <p key={change.id} className="mt-1 text-muted-foreground">
                    {change.type.toLowerCase()} change requested{" "}
                    {new Date(change.createdAt).toLocaleDateString("en-GB")}
                  </p>
                ))}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      )}

      {showPortfolio && activeTab === "portfolio" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio and work samples</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePortfolio} className="space-y-4">
              <Field
                label="Portfolio headline"
                id="portfolioHeadline"
                value={portfolioHeadline}
                onChange={setPortfolioHeadline}
                placeholder="e.g. WordPress and React website specialist"
              />
              <div className="space-y-2">
                <Label htmlFor="portfolioSummary">Portfolio summary</Label>
                <textarea
                  id="portfolioSummary"
                  value={portfolioSummary}
                  onChange={(event) => setPortfolioSummary(event.target.value)}
                  placeholder="Short public profile summary, experience and service focus."
                  className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Portfolio URL"
                  id="portfolioUrl"
                  value={portfolioUrl}
                  onChange={setPortfolioUrl}
                  placeholder="https://..."
                />
                <Field
                  label="Figma URL"
                  id="portfolioFigmaUrl"
                  value={portfolioFigmaUrl}
                  onChange={setPortfolioFigmaUrl}
                  placeholder="https://figma.com/..."
                />
                <Field
                  label="Live project URL"
                  id="portfolioLiveUrl"
                  value={portfolioLiveUrl}
                  onChange={setPortfolioLiveUrl}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <Label htmlFor="portfolioWebProjects">
                    Web projects
                  </Label>
                  <textarea
                    id="portfolioWebProjects"
                    value={portfolioWebProjects}
                    onChange={(event) =>
                      setPortfolioWebProjects(event.target.value)
                    }
                    placeholder="Title | Thumbnail URL | Live link | Short brief"
                    className="min-h-36 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    One project per line. Use for website/app work with a live
                    link.
                  </p>
                </div>
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <Label htmlFor="portfolioDesignProjects">
                    Design / Figma projects
                  </Label>
                  <textarea
                    id="portfolioDesignProjects"
                    value={portfolioDesignProjects}
                    onChange={(event) =>
                      setPortfolioDesignProjects(event.target.value)
                    }
                    placeholder="Title | Thumbnail URL | Figma prototype link | Short brief"
                    className="min-h-36 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    One project per line. Use for UI/UX, graphics and design
                    prototypes.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <Label htmlFor="portfolioGraphicsProjects">
                    Graphics / branding work
                  </Label>
                  <textarea
                    id="portfolioGraphicsProjects"
                    value={portfolioGraphicsProjects}
                    onChange={(event) =>
                      setPortfolioGraphicsProjects(event.target.value)
                    }
                    placeholder="Title | Thumbnail URL | Short brief | Gallery URL 1, Gallery URL 2"
                    className="min-h-36 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Use for logo, social banner, brand identity, flyer and
                    graphic design samples. Gallery is optional.
                  </p>
                </div>
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <Label htmlFor="portfolioArchitectureProjects">
                    Architecture / 3D work
                  </Label>
                  <textarea
                    id="portfolioArchitectureProjects"
                    value={portfolioArchitectureProjects}
                    onChange={(event) =>
                      setPortfolioArchitectureProjects(event.target.value)
                    }
                    placeholder="Title | Thumbnail URL | Short brief | Gallery URL 1, Gallery URL 2"
                    className="min-h-36 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Use for interior, exterior, architectural render, model and
                    visualization samples. Gallery is optional.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolioWork">Other work notes</Label>
                <textarea
                  id="portfolioWork"
                  value={portfolioWork}
                  onChange={(event) => setPortfolioWork(event.target.value)}
                  placeholder="One extra note per line"
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground">
                  Extra notes can appear below Web and Design work when public
                  portfolio is enabled.
                </p>
              </div>
              <label className="flex items-start gap-2 rounded-md border bg-muted/20 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={portfolioVisible}
                  onChange={(event) => setPortfolioVisible(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span>
                  Show this portfolio on public team profile
                  <span className="block text-xs text-muted-foreground">
                    Admin can still hide or override team cards from Public Portal manager.
                  </span>
                </span>
              </label>
              <Button type="submit" size="sm" disabled={portfolioBusy}>
                {portfolioBusy ? "Saving..." : "Save portfolio"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showPayment && activeTab === "payment" && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payout method</Label>
                <Select
                  value={method}
                  onValueChange={(value) => value && setMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bKash">bKash</SelectItem>
                    <SelectItem value="Nagad">Nagad</SelectItem>
                    <SelectItem value="Bank">Bank transfer</SelectItem>
                    <SelectItem value="Payoneer">Payoneer</SelectItem>
                    <SelectItem value="Wise">Wise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pfDetails">Account details</Label>
                {mobilePayout ? (
                  <Input
                    id="pfDetails"
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="e.g. 017XX-XXXXXX"
                  />
                ) : (
                  <textarea
                    id="pfDetails"
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="Bank name, account name, account number, branch, routing, note..."
                    className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
              </div>
            </div>

            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving..." : "Save payment"}
            </Button>

            <p className="text-[10px] text-muted-foreground">
              Payout changes go under review for non-admin users. Withdrawal
              requests are allowed, but payment waits up to 24 hours for
              verification unless admin approves earlier.
            </p>

            {payoutPending.length > 0 &&
              withdrawBlockedUntil &&
              new Date(withdrawBlockedUntil) > new Date() && (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700">
                  Verification wait until{" "}
                  {new Date(withdrawBlockedUntil).toLocaleString("en-GB")}.
                  You can still submit a withdrawal request.
                </p>
              )}

            {payoutPending.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="font-medium">Pending review</p>
                {payoutPending.map((change) => (
                  <p key={change.id} className="mt-1 text-muted-foreground">
                    {change.type.toLowerCase()} change requested{" "}
                    {new Date(change.createdAt).toLocaleDateString("en-GB")}
                  </p>
                ))}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      )}

      {activeTab === "security" && (
      <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Email and security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={saveEmail} className="space-y-3">
            <Field label="Email address" id="pfEmail" type="email" value={nextEmail} onChange={setNextEmail} required />
            <Button type="submit" size="sm" variant="outline" disabled={emailBusy}>
              {emailBusy ? "Requesting..." : "Request email change"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Email changes require admin review before they become active.
            </p>
            {emailPending.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <p className="font-medium">Pending review</p>
                {emailPending.map((change) => (
                  <p key={change.id} className="mt-1 text-muted-foreground">
                    {change.type.toLowerCase()} change requested{" "}
                    {new Date(change.createdAt).toLocaleDateString("en-GB")}
                  </p>
                ))}
              </div>
            )}
          </form>

          <div className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
              <p className="text-sm font-medium">2-factor login</p>
              <p className="text-xs text-muted-foreground">
                Use WhatsApp or Google/Microsoft Authenticator for stronger account security.
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Current: {methodText}
              </p>
              </div>
            </div>
            {(hasWhatsApp2fa || hasAuthenticator2fa) && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorOffPassword">
                  Password{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    (required to turn a method off below)
                  </span>
                </Label>
                <Input
                  id="twoFactorOffPassword"
                  type="password"
                  value={twoFactorOffPassword}
                  onChange={(event) =>
                    setTwoFactorOffPassword(event.target.value)
                  }
                  placeholder="Current password"
                />
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-muted/25 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">WhatsApp 2FA</p>
                    <p className="text-xs text-muted-foreground">
                      Send login and verification codes to your WhatsApp number.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                      hasWhatsApp2fa
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {hasWhatsApp2fa ? "On" : "Off"}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  variant={hasWhatsApp2fa ? "destructive" : "default"}
                  onClick={toggleWhatsAppTwoFactor}
                  disabled={securityBusy}
                >
                  {hasWhatsApp2fa ? "Turn off WhatsApp" : "Turn on WhatsApp"}
                </Button>
              </div>
              <div className="rounded-md border bg-muted/25 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Authenticator app</p>
                    <p className="text-xs text-muted-foreground">
                      Use Google or Microsoft Authenticator with a QR code.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                      hasAuthenticator2fa
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {hasAuthenticator2fa ? "On" : "Off"}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  variant={hasAuthenticator2fa ? "destructive" : "default"}
                  onClick={toggleAuthenticatorTwoFactor}
                  disabled={securityBusy}
                >
                  {hasAuthenticator2fa
                    ? "Turn off Authenticator"
                    : "Turn on Authenticator"}
                </Button>
              </div>
            </div>
          </div>
          {authSecret && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <p className="text-sm font-medium">Add this to Google or Microsoft Authenticator</p>
              {authQrUrl && (
                <div className="inline-flex rounded-md border bg-white p-3">
                  <img
                    src={authQrUrl}
                    alt="Authenticator setup QR code"
                    className="h-[220px] w-[220px]"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Scan the QR code, then enter the 6 digit code from your app.
              </p>
              <p className="break-all font-mono text-xs">{authSecret}</p>
              <p className="break-all text-[10px] text-muted-foreground">{authUrl}</p>
              <div className="flex gap-2">
                <Input
                  value={authCode}
                  onChange={(event) => setAuthCode(event.target.value)}
                  placeholder="6 digit code"
                  inputMode="numeric"
                />
                <Button type="button" onClick={confirmAuthenticator} disabled={securityBusy || authCode.length < 6}>
                  Verify
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Device login history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No trusted device history yet.
            </p>
          ) : (
            loginDevices.map((device) => {
              const browser =
                device.userAgent?.split(" ").slice(-2).join(" ") ||
                "Unknown device";
              const place = [device.city, device.region, device.country]
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={device.id}
                  className="rounded-md border bg-muted/20 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{browser}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        device.trusted
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {device.trusted ? "Trusted" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    IP {device.ipAddress ?? "unknown"}
                    {place ? ` - ${place}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last used{" "}
                    {new Date(device.lastSeenAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Current password" id="pwCurrent" type="password" value={current} onChange={setCurrent} required />
              <Field label="New password (min 8)" id="pwNext" type="password" value={next} onChange={setNext} required />
            </div>
            {twoFactorEnabled && (
              <div className="space-y-2">
                <Label htmlFor="pwCode">2FA code</Label>
                <div className="flex gap-2">
                  <Input
                    id="pwCode"
                    value={pwCode}
                    onChange={(event) => setPwCode(event.target.value)}
                    placeholder="6 digit code"
                    inputMode="numeric"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={sendPasswordChangeCode}
                    disabled={pwCodeSending}
                  >
                    {pwCodeSending ? "Sending..." : "Send code"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  2FA is on for this account, so changing your password needs
                  a verification code too.
                </p>
              </div>
            )}
            <Button type="submit" size="sm" variant="outline" disabled={pwBusy}>
              {pwBusy ? "Changing..." : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
      )}
    </>
  );
}

function UploadBox({
  label,
  uploaded,
  fileUrl,
  uploading,
  accept,
  onFile,
  onOpen,
}: {
  label: string;
  uploaded: boolean;
  fileUrl?: string;
  uploading: boolean;
  accept: string;
  onFile: (file: File) => void;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {fileUrl?.trim() && accept.startsWith("image") && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-2">
          <img
            src={fileUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            Current image saved
          </span>
        </div>
      )}
      <div className="flex gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center rounded-md border border-dashed p-2 text-xs text-muted-foreground hover:bg-muted">
          {uploading ? "Uploading..." : uploaded ? "Uploaded" : "Upload file"}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </label>
        {uploaded && (
          <Button type="button" size="sm" variant="outline" onClick={onOpen}>
            Open
          </Button>
        )}
      </div>
    </div>
  );
}

function ProfileTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
