"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sendOtp, verifyOtp } from "@/actions/otp.actions";
import {
  registerAccount,
  getPublicSkills,
  getSignupRequirements,
} from "@/actions/register.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Skill = { id: string; name: string };

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<"CLIENT" | "WORKER">("CLIENT");

  // Step 1-2: email + OTP
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  // Step 3: common
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");

  // Worker extras
  const [gender, setGender] = useState<string | null>(null);
  const [profession, setProfession] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [nidUrl, setNidUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState<"nid" | "photo" | null>(null);
  const [nidRequirement, setNidRequirement] = useState<
    "OFF" | "OPTIONAL" | "REQUIRED"
  >("REQUIRED");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (kind === "WORKER" && skills.length === 0) {
      getPublicSkills().then((r) => setSkills(r.skills));
    }
  }, [kind, skills.length]);

  useEffect(() => {
    getSignupRequirements().then((r) => setNidRequirement(r.nidRequirement));
  }, []);

  async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await sendOtp(email, phone);
    setBusy(false);
    if (result.error) return setError(result.error);
    setInfo(
      "devNote" in result && result.devNote
        ? String(result.devNote)
        : `Code sent to ${email} — check your inbox (and spam)`
    );
    setStep(2);
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await verifyOtp(email, code);
    setBusy(false);
    if (result.error) return setError(result.error);
    setInfo("");
    setStep(3);
  }

  async function uploadFile(file: File, which: "nid" | "photo") {
    setError("");
    setUploading(which);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("email", email);
    fd.append("assetKind", which === "photo" ? "profile-photo" : "identity-doc");
    fd.append("visibility", which === "photo" ? "public" : "private");
    try {
      const res = await fetch("/api/register-upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (which === "nid") setNidUrl(data.url);
      else setPhotoUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(null);
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await registerAccount({
      kind,
      name,
      email,
      phone,
      password,
      companyName,
      country,
      gender: gender ?? undefined,
      profession,
      skillIds,
      nidUrl,
      photoUrl,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setDone(true);
  }

  async function handleClientRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await registerAccount({
      kind: "CLIENT",
      name,
      email,
      phone,
      password,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-2xl">✅</p>
            <p className="font-semibold">
              {kind === "CLIENT" ? "Account created!" : "Registration received!"}
            </p>
            <p className="text-sm text-muted-foreground">
              {kind === "CLIENT"
                ? "Your client account is ready. Sign in now and complete the rest from profile."
                : "The AP Tech team will review and approve your account. You'll get an email once it's ready."}
            </p>
            <Link href="/login" className="text-sm text-primary underline">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            Create an account
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            AP Tech <span className="text-primary">Hub</span>
            {` - step ${step} of 3`}
          </p>
        </CardHeader>
        <CardContent>
          {/* Type toggle */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("CLIENT")}
              disabled={step === 3}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                kind === "CLIENT"
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              I'm a client
            </button>
            <button
              type="button"
              onClick={() => setKind("WORKER")}
              disabled={step === 3}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                kind === "WORKER"
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              I want to work
            </button>
          </div>

          {info ? (
            <p className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
              {info}
            </p>
          ) : null}

          {kind === "CLIENT" && step === 3 ? (
            <form onSubmit={handleClientRegister} className="space-y-4">
              <p className="rounded-md bg-green-50 px-3 py-1.5 text-xs text-green-700">
                ✓ {email} verified
              </p>

              <div className="space-y-2">
                <Label htmlFor="clientName">Name</Label>
                <Input
                  id="clientName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPass">Password (min 8)</Label>
                <Input
                  id="clientPass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error ? (
                <p className="text-center text-sm text-red-500">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating..." : "Create client account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Company documents can be completed later from profile.
              </p>
            </form>
          ) : null}

          {/* STEP 1 — email */}
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rgEmail">Email</Label>
                <Input
                  id="rgEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rgWhatsApp">
                  WhatsApp number{" "}
                  <span className="text-[10px] text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="rgWhatsApp"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801..."
                />
              </div>
              {error ? (
                <p className="text-center text-sm text-red-500">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending..." : "Send verification code"}
              </Button>
            </form>
          ) : null}

          {/* STEP 2 — OTP */}
          {step === 2 ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rgCode">6-digit code</Label>
                <Input
                  id="rgCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg tracking-[0.5em]"
                  required
                  autoFocus
                />
              </div>
              {error ? (
                <p className="text-center text-sm text-red-500">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Verifying..." : "Verify email"}
              </Button>
              <button
                type="button"
                onClick={async () => {
                  setError("");
                  const r = await sendOtp(email, phone);
                  if (r.error) setError(r.error);
                  else setInfo("New code sent!");
                }}
                className="w-full text-center text-xs text-primary hover:underline"
              >
                Resend code
              </button>
            </form>
          ) : null}

          {/* STEP 3 — details */}
          {kind === "WORKER" && step === 3 ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="rounded-md bg-green-50 px-3 py-1.5 text-xs text-green-700">
                ✓ {email} verified
              </p>

              <div className="space-y-2">
                <Label htmlFor="rgName">Your name</Label>
                <Input
                  id="rgName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rgPhone">
                    Phone{" "}
                    <span className="text-[10px] text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="rgPhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rgPass">Password (min 8)</Label>
                  <Input
                    id="rgPass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rgProf">Profession</Label>
                      <Input
                        id="rgProf"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="e.g. UI/UX Designer"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Skills{" "}
                      <span className="text-[10px] text-muted-foreground">
                        ({skillIds.length}/5 selected)
                      </span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => {
                        const on = skillIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setSkillIds((prev) =>
                                on
                                  ? prev.filter((x) => x !== s.id)
                                  : prev.length < 5
                                    ? [...prev, s.id]
                                    : prev
                              )
                            }
                            className={`rounded-full border px-2.5 py-1 text-xs ${
                              on
                                ? "border-primary bg-primary/10 font-medium text-primary"
                                : skillIds.length >= 5
                                  ? "text-muted-foreground/40"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {s.name}
                            {on ? " ✓" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {nidRequirement !== "OFF" && (
                      <div className="space-y-2">
                        <Label>
                          NID / Passport
                          {nidRequirement === "OPTIONAL" && (
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                              (optional)
                            </span>
                          )}
                        </Label>
                        <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted">
                          {uploading === "nid"
                            ? "Uploading..."
                            : nidUrl
                              ? "✓ Uploaded"
                              : "Upload (JPG/PDF, 5MB)"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadFile(f, "nid");
                            }}
                          />
                        </label>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Your photo</Label>
                      <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted">
                        {uploading === "photo"
                          ? "Uploading..."
                          : photoUrl
                            ? "✓ Uploaded"
                            : "Upload (JPG/PNG, 5MB)"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadFile(f, "photo");
                          }}
                        />
                      </label>
                    </div>
                  </div>
              </>

              {error ? (
                <p className="text-center text-sm text-red-500">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating..." : "Create account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Accounts need admin approval before first sign-in.
              </p>
            </form>
          ) : null}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
