"use client";

import { useEffect, useState } from "react";
import {
  getLoginOptions,
  login,
  requestLoginHelp,
  requestPasswordlessLoginCode,
} from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LoginForm({
  initialMessage = "",
  nextPath = "",
}: {
  initialMessage?: string;
  nextPath?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [loginMode, setLoginMode] = useState<
    "password" | "authenticator" | "email" | "whatsapp"
  >("password");
  const [passwordlessMethods, setPasswordlessMethods] = useState<string[]>([]);
  const [passwordlessCodeSent, setPasswordlessCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [helpName, setHelpName] = useState("");
  const [helpPhone, setHelpPhone] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("aptech_login_device") ?? "";
    setDeviceToken(savedToken);
  }, []);

  async function refreshLoginOptions(nextEmail = email) {
    if (!nextEmail.includes("@")) {
      setPasswordlessMethods([]);
      if (loginMode !== "password") {
        setLoginMode("password");
      }
      return;
    }
    const result = await getLoginOptions(nextEmail);
    setPasswordlessMethods(result.methods);
    if (
      loginMode === "authenticator" &&
      !result.methods.includes("AUTHENTICATOR")
    ) {
      setLoginMode("password");
    }
    if (loginMode === "email" && !result.methods.includes("EMAIL")) {
      setLoginMode("password");
    }
    if (loginMode === "whatsapp" && !result.methods.includes("WHATSAPP")) {
      setLoginMode("password");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (
      (loginMode === "email" || loginMode === "whatsapp") &&
      !passwordlessCodeSent
    ) {
      const method = loginMode === "email" ? "EMAIL" : "WHATSAPP";
      const result = await requestPasswordlessLoginCode(email, method);
      if (result?.error) {
        setError(result.error);
        if (result.contactAdmin) setShowHelp(true);
        setLoading(false);
        return;
      }
      setPasswordlessCodeSent(true);
      setMessage(result.message ?? "Enter the login code.");
      setLoading(false);
      return;
    }

    const result = await login({
      email,
      password: loginMode === "password" ? password : "",
      deviceToken,
      code:
        needsCode ||
        loginMode === "authenticator" ||
        loginMode === "email" ||
        loginMode === "whatsapp"
          ? code
          : "",
      authLogin:
        loginMode === "authenticator" ||
        loginMode === "email" ||
        loginMode === "whatsapp",
      authMethod:
        loginMode === "authenticator"
          ? "AUTHENTICATOR"
          : loginMode === "email"
            ? "EMAIL"
            : loginMode === "whatsapp"
              ? "WHATSAPP"
              : undefined,
      next: nextPath,
    });

    if (result?.error) {
      setError(result.error);
      if (result.contactAdmin) setShowHelp(true);
      setLoading(false);
      return;
    }

    if (result?.requires2fa) {
      setNeedsCode(true);
      setMessage(result.message ?? "Enter the login code from your email.");
      setLoading(false);
      return;
    }

    if (result?.redirectTo) {
      if (result.deviceToken) {
        window.localStorage.setItem("aptech_login_device", result.deviceToken);
      }
      // Hard navigation so a fresh browser/incognito session picks up the auth cookie.
      window.location.replace(result.redirectTo);
      return;
    }

    setError("Login failed. Please try again.");
    setLoading(false);
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Login method</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "password", label: "Password" },
                    { value: "email", label: "Email OTP" },
                    ...(passwordlessMethods.includes("WHATSAPP")
                      ? [{ value: "whatsapp", label: "WhatsApp OTP" }]
                      : []),
                    ...(passwordlessMethods.includes("AUTHENTICATOR")
                      ? [{ value: "authenticator", label: "Authenticator" }]
                      : []),
                  ] as { value: typeof loginMode; label: string }[]
                ).map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => {
                      setLoginMode(method.value);
                      setNeedsCode(false);
                      setCode("");
                      setPasswordlessCodeSent(false);
                    }}
                    className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                      loginMode === method.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onBlur={() => refreshLoginOptions()}
              onChange={(e) => {
                setEmail(e.target.value);
                setPasswordlessCodeSent(false);
                if (!e.target.value.includes("@")) {
                  setPasswordlessMethods([]);
                }
              }}
              placeholder="you@company.com"
              required
            />
          </div>

            {loginMode === "authenticator" ? (
              <div className="space-y-2">
                <Label htmlFor="auth-code">Authenticator code</Label>
                <Input
                  id="auth-code"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6 digit code"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Password chara direct login. Ei option shudhu Authenticator
                  2FA on thakle kaj korbe.
                </p>
              </div>
            ) : loginMode === "email" || loginMode === "whatsapp" ? (
              <div className="space-y-2">
                <Label htmlFor="otp-code">
                  {loginMode === "email" ? "Email OTP" : "WhatsApp OTP"}
                </Label>
                <Input
                  id="otp-code"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={
                    passwordlessCodeSent
                      ? "Enter 6 digit code"
                      : "Click button to send code"
                  }
                  required={passwordlessCodeSent}
                />
                <p className="text-xs text-muted-foreground">
                  Password chara OTP diye login. Ei option shudhu profile-e on
                  thakle show korbe.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

          {needsCode && loginMode !== "authenticator" && (
            <div className="space-y-2">
              <Label htmlFor="code">Login code</Label>
              <Input
                id="code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6 digit code"
                required
              />
            </div>
          )}

          {message && (
            <p className="text-center text-sm text-muted-foreground">
              {message}
            </p>
          )}

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Signing in..."
                : loginMode === "authenticator"
                  ? "Login with Authenticator"
                  : loginMode === "email" || loginMode === "whatsapp"
                    ? passwordlessCodeSent
                      ? "Verify OTP and login"
                      : "Send login OTP"
                  : needsCode
                    ? "Verify and sign in"
                    : "Sign in"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowHelp(true)}
            >
              Need Help
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login help</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setHelpMessage("");
              const result = await requestLoginHelp({
                name: helpName,
                email,
                phone: helpPhone,
              });

              if (result?.error) {
                setHelpMessage(result.error);
                return;
              }

              setHelpMessage("Request sent. Admin team will contact you.");
              setHelpName("");
              setHelpPhone("");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="help-name">Name</Label>
              <Input
                id="help-name"
                value={helpName}
                onChange={(event) => setHelpName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="help-email">Email</Label>
              <Input id="help-email" value={email} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="help-phone">Phone / WhatsApp</Label>
              <Input
                id="help-phone"
                value={helpPhone}
                onChange={(event) => setHelpPhone(event.target.value)}
                required
              />
            </div>
            {helpMessage && (
              <p className="text-sm text-muted-foreground">{helpMessage}</p>
            )}
            <Button type="submit" className="w-full">
              Send
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
