"use client";

import { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import {
  getLoginOptions,
  login,
  loginWithPasskey,
  requestLoginHelp,
  requestPasswordlessLoginCode,
} from "@/actions/auth.actions";
import {
  startPasskeyLogin,
  verifyPasskeyAssertion,
} from "@/actions/passkey.actions";
import {
  getMobileLoginStatus,
  loginWithMobileApproval,
  requestMobileLogin,
} from "@/actions/mobile-login.actions";
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
    "password" | "authenticator" | "email" | "whatsapp" | "mobile"
  >("password");
  const [mobileRequestId, setMobileRequestId] = useState<string | null>(null);
  const [mobileStatus, setMobileStatus] = useState<
    "idle" | "pending" | "denied" | "expired"
  >("idle");
  // Fingerprint sign-in is offered only on mobile, with a real platform
  // sensor (Touch ID / Face ID / Android fingerprint) — desktop WebAuthn
  // support (security keys, etc.) exists but isn't the "fingerprint" the
  // button promises, and showing it there would just be a confusing prompt
  // most desktops can't satisfy.
  const [passkeySupported, setPasskeySupported] = useState(false);
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

    let cancelled = false;

    async function detectPasskeySupport() {
      if (typeof window === "undefined" || !window.PublicKeyCredential) return;

      // Mobile only — same UA check as defaultPasskeyLabel in lib/passkey.ts.
      const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
      if (!isMobile) return;

      // A browser can support WebAuthn without the device having an actual
      // fingerprint/Face ID sensor (e.g. only external security keys) — the
      // button promises "fingerprint," so it should only appear when one is
      // really there. Same check passkey-manager.tsx uses for registration.
      const hasPlatformAuthenticator = await window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable?.()
        .catch(() => false);

      if (!cancelled) setPasskeySupported(Boolean(hasPlatformAuthenticator));
    }

    void detectPasskeySupport();
    return () => {
      cancelled = true;
    };
  }, []);

  // onBlur alone missed this on mobile: autofill, virtual-keyboard "Done"/
  // "Go", and tapping straight from the email field to a login-method
  // button can all skip a blur event, so the Fingerprint option (gated on
  // passwordlessMethods including PASSKEY) never appeared even when a
  // passkey was actually registered. Debounced refresh as they type covers
  // that without hitting the server on every keystroke.
  useEffect(() => {
    if (!email.includes("@")) return;
    const timeout = setTimeout(() => {
      void refreshLoginOptions(email);
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // "Login with mobile": once a request is sent, poll for it being
  // approved/denied elsewhere (the approval page at /approve-signin/[id]).
  // Stops itself on a terminal status or when the request/mode changes.
  useEffect(() => {
    if (!mobileRequestId || mobileStatus !== "pending") return;
    let cancelled = false;

    const interval = setInterval(async () => {
      const result = await getMobileLoginStatus(mobileRequestId);
      if (cancelled) return;

      if (result.status === "APPROVED" && result.token && result.email) {
        clearInterval(interval);
        const loginResult = await loginWithMobileApproval({
          email: result.email,
          token: result.token,
          deviceToken,
          next: nextPath,
        });
        if (cancelled) return;

        if (loginResult?.error) {
          setError(loginResult.error);
          setMobileStatus("idle");
          setMobileRequestId(null);
          return;
        }
        if (loginResult?.redirectTo) {
          if (loginResult.deviceToken) {
            window.localStorage.setItem(
              "aptech_login_device",
              loginResult.deviceToken
            );
          }
          window.location.replace(loginResult.redirectTo);
        }
        return;
      }

      if (result.status === "DENIED") {
        clearInterval(interval);
        setMobileStatus("denied");
        return;
      }

      if (result.status === "EXPIRED") {
        clearInterval(interval);
        setMobileStatus("expired");
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileRequestId, mobileStatus]);

  async function handleRequestMobileLogin() {
    if (!email.includes("@")) {
      setError("Enter your email first");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    const result = await requestMobileLogin(email);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setMobileRequestId(result.requestId);
    setMobileStatus("pending");
  }

  async function handlePasskeyLogin() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const started = await startPasskeyLogin(email);
      if (started.error || !started.options) {
        setError(started.error ?? "Could not start fingerprint sign-in");
        setLoading(false);
        return;
      }

      // Opens the device prompt (Touch ID, Windows Hello, Android fingerprint).
      const assertion = await startAuthentication({
        optionsJSON: started.options,
      });

      const verified = await verifyPasskeyAssertion(assertion);
      if (verified.error || !verified.token || !verified.email) {
        setError(verified.error ?? "Fingerprint could not be verified");
        setLoading(false);
        return;
      }

      const result = await loginWithPasskey({
        email: verified.email,
        token: verified.token,
        deviceToken,
        next: nextPath,
      });

      if (result?.error) {
        setError(result.error);
        if (result.contactAdmin) setShowHelp(true);
        setLoading(false);
        return;
      }

      if (result?.redirectTo) {
        if (result.deviceToken) {
          window.localStorage.setItem("aptech_login_device", result.deviceToken);
        }
        window.location.replace(result.redirectTo);
        return;
      }

      setError("Fingerprint sign-in failed. Please try again.");
      setLoading(false);
    } catch (passkeyError) {
      // Cancelling the OS prompt lands here; it is not an error worth shouting
      // about, so keep the copy calm and let the user pick another method.
      console.error("Passkey sign-in failed:", passkeyError);
      setError(
        "Fingerprint sign-in was cancelled or is not available on this device."
      );
      setLoading(false);
    }
  }

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

    if (loginMode === "mobile") {
      if (mobileStatus === "pending") return;
      await handleRequestMobileLogin();
      return;
    }

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
            {passkeySupported && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={loading}
                  onClick={handlePasskeyLogin}
                >
                  <Fingerprint className="h-4 w-4" />
                  Sign in with fingerprint
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Email lagbe na — device-e already registered thakle direct
                  recognize hoye jabe. Na thakle onnovabe (password/OTP)
                  login korun niche.
                </p>
                <div className="relative py-1 text-center text-xs text-muted-foreground">
                  <span className="relative bg-background px-2">or</span>
                  <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Login method</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "password", label: "Password" },
                    { value: "email", label: "Email OTP" },
                    { value: "mobile", label: "Login via mobile" },
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
                      setMobileRequestId(null);
                      setMobileStatus("idle");
                      setError("");
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

            {loginMode === "mobile" ? (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Ei email e logged-in mobile e ekta notification jabe. Sekhane
                  Access die fingerprint diye confirm korle, ei browser e
                  automatically login hoye jabe.
                </p>
                {mobileStatus === "pending" && (
                  <p className="text-sm font-medium">
                    Waiting for approval on your mobile...
                  </p>
                )}
                {mobileStatus === "denied" && (
                  <p className="text-sm font-medium text-red-500">
                    Request was denied on your mobile.
                  </p>
                )}
                {mobileStatus === "expired" && (
                  <p className="text-sm font-medium text-amber-600">
                    Request expired without a response. Try again.
                  </p>
                )}
              </div>
            ) : loginMode === "authenticator" ? (
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

          {needsCode && loginMode !== "authenticator" && loginMode !== "mobile" && (
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

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading || (loginMode === "mobile" && mobileStatus === "pending")
              }
            >
              {loginMode === "mobile"
                ? mobileStatus === "pending"
                  ? "Waiting for approval..."
                  : loading
                    ? "Sending request..."
                    : mobileStatus === "denied" || mobileStatus === "expired"
                      ? "Send request again"
                      : "Send request to mobile"
                : loading
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
