"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deletePasskey,
  finishPasskeyRegistration,
  renamePasskey,
  startPasskeyRegistration,
} from "@/actions/passkey.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type PasskeyRow = {
  id: string;
  label: string;
  deviceType: string | null;
  backedUp: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

function formatDate(value: string | null) {
  if (!value) return "never";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PasskeyManager({ passkeys }: { passkeys: PasskeyRow[] }) {
  const [capability, setCapability] = useState({
    supported: false,
    platform: false,
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    // Detects whether this device actually has a fingerprint/face sensor, as
    // opposed to only supporting external security keys. Resolved
    // asynchronously so nothing is set during the effect body itself.
    async function detect() {
      if (typeof window === "undefined" || !window.PublicKeyCredential) {
        return;
      }

      const platform = await window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable?.()
        .catch(() => false);

      if (!cancelled) {
        setCapability({ supported: true, platform: platform ?? false });
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = () => {
    startTransition(async () => {
      try {
        const started = await startPasskeyRegistration();
        if (started.error || !started.options) {
          toast.error(started.error ?? "Could not start fingerprint setup");
          return;
        }

        const attestation = await startRegistration({
          optionsJSON: started.options,
        });

        const result = await finishPasskeyRegistration(attestation);
        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Fingerprint added to this account");
        router.refresh();
      } catch (error) {
        console.error("Passkey registration failed:", error);
        toast.error(
          "Setup was cancelled, or this device is already registered."
        );
      }
    });
  };

  const submitRename = (id: string) => {
    startTransition(async () => {
      const result = await renamePasskey(id, renameValue);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setRenamingId(null);
      setRenameValue("");
      router.refresh();
    });
  };

  const remove = (passkey: PasskeyRow) => {
    if (
      !window.confirm(
        `Remove "${passkey.label}"? You will not be able to sign in with it any more.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deletePasskey(passkey.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Passkey removed");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Fingerprint className="h-4 w-4" />
          Fingerprint &amp; Face ID
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Register this device to sign in with your fingerprint, Face ID or
          Windows Hello instead of a password. Your fingerprint never leaves
          the device — only a signed confirmation is sent to us.
        </p>

        {passkeys.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No device registered yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {passkeys.map((passkey) => (
              <li
                key={passkey.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                {renamingId === passkey.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      placeholder="Device name"
                      className="h-9 max-w-[220px]"
                    />
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => submitRename(passkey.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRenamingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="font-medium">{passkey.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {formatDate(passkey.createdAt)} · last used{" "}
                        {formatDate(passkey.lastUsedAt)}
                        {passkey.backedUp ? " · synced across devices" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRenamingId(passkey.id);
                          setRenameValue(passkey.label);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => remove(passkey)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {capability.supported ? (
          <div className="space-y-2">
            <Button onClick={register} disabled={pending}>
              <Fingerprint className="mr-2 h-4 w-4" />
              {pending ? "Waiting for device..." : "Register this device"}
            </Button>
            {!capability.platform && (
              <p className="text-xs text-amber-600">
                This device has no built-in fingerprint or face sensor. You can
                still register a security key, or set this up on your phone.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-amber-600">
            This browser does not support passkeys. Try a recent Chrome, Safari
            or Edge — and note that fingerprint sign-in needs an https address.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
