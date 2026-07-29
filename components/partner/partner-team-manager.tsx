"use client";

import { KeyRound, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createPartnerManager,
  deletePartnerManager,
  resetPartnerManagerPassword,
  setPartnerManagerStatus,
  updatePartnerManagerPermission,
} from "@/actions/partner-team.actions";
import {
  PARTNER_MANAGER_RESOURCES,
  type PartnerManagerStatus,
} from "@/lib/partner-team";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Permission = {
  resource: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export type PartnerManagerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  accountStatus: string;
  lastActiveAt: string | null;
  createdAt: string;
  permissions: Permission[];
};

const STATUS_OPTIONS: {
  value: PartnerManagerStatus;
  label: string;
  hint: string;
}[] = [
  { value: "ACTIVE", label: "Active", hint: "Can sign in and work normally" },
  { value: "HOLD", label: "On hold", hint: "Temporarily blocked from signing in" },
  { value: "SUSPENDED", label: "Suspended", hint: "Blocked until you re-activate" },
];

const ACTIONS = [
  { key: "canRead", label: "View" },
  { key: "canCreate", label: "Add" },
  { key: "canUpdate", label: "Edit" },
  { key: "canDelete", label: "Delete" },
] as const;

function statusTone(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  }
  if (status === "HOLD") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  }
  return "border-red-500/30 bg-red-500/10 text-red-600";
}

function emptyPermission(resource: string): Permission {
  return {
    resource,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  };
}

export function PartnerTeamManager({
  managers,
}: {
  managers: PartnerManagerRow[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submitCreate = () => {
    startTransition(async () => {
      const result = await createPartnerManager(draft);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${draft.name} can now sign in as your manager`);
      setDraft({ name: "", email: "", phone: "", password: "" });
      setShowCreate(false);
      router.refresh();
    });
  };

  const togglePermission = (
    manager: PartnerManagerRow,
    resource: string,
    action: (typeof ACTIONS)[number]["key"],
    value: boolean
  ) => {
    const current =
      manager.permissions.find((item) => item.resource === resource) ??
      emptyPermission(resource);

    const next = { ...current, [action]: value };

    // Nothing else is usable without view access, so turning View off clears
    // the rest rather than leaving a permission that silently does nothing.
    if (action === "canRead" && !value) {
      next.canCreate = false;
      next.canUpdate = false;
      next.canDelete = false;
    }
    // ...and granting any other action implies view.
    if (action !== "canRead" && value) {
      next.canRead = true;
    }

    startTransition(async () => {
      const result = await updatePartnerManagerPermission({
        managerId: manager.id,
        resource,
        canCreate: next.canCreate,
        canRead: next.canRead,
        canUpdate: next.canUpdate,
        canDelete: next.canDelete,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  const changeStatus = (
    manager: PartnerManagerRow,
    status: PartnerManagerStatus
  ) => {
    startTransition(async () => {
      const result = await setPartnerManagerStatus(manager.id, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${manager.name} is now ${status.toLowerCase()}`);
      router.refresh();
    });
  };

  const submitReset = (manager: PartnerManagerRow) => {
    startTransition(async () => {
      const result = await resetPartnerManagerPassword(
        manager.id,
        resetPassword
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Password updated — share it with your manager");
      setResetFor(null);
      setResetPassword("");
    });
  };

  const remove = (manager: PartnerManagerRow) => {
    if (
      !window.confirm(
        `Delete ${manager.name}? Their login is removed permanently.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deletePartnerManager(manager.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Manager deleted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My team</h1>
          <p className="text-sm text-muted-foreground">
            Add managers to help run your partner portal. Each manager is tied
            to your account - never another partner&apos;s.
          </p>
        </div>
        <Button onClick={() => setShowCreate((open) => !open)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add manager
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New manager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="mgr-name">Full name</Label>
                <Input
                  id="mgr-name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  placeholder="Manager name"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mgr-email">Email</Label>
                <Input
                  id="mgr-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft({ ...draft, email: event.target.value })
                  }
                  placeholder="manager@example.com"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mgr-phone">Phone (optional)</Label>
                <Input
                  id="mgr-phone"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft({ ...draft, phone: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mgr-password">Temporary password</Label>
                <Input
                  id="mgr-password"
                  type="text"
                  value={draft.password}
                  onChange={(event) =>
                    setDraft({ ...draft, password: event.target.value })
                  }
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Share the password with your manager directly and ask them to
              change it after their first sign-in.
            </p>
            <div className="flex gap-2">
              <Button disabled={pending} onClick={submitCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {pending ? "Creating..." : "Create manager"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {managers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No managers yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              A manager can help with partner work and messages on your behalf.
              You decide exactly what they can see and do.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {managers.map((manager) => (
            <Card key={manager.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{manager.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {manager.email}
                      {manager.phone ? ` · ${manager.phone}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${statusTone(
                      manager.accountStatus
                    )}`}
                  >
                    {manager.accountStatus.toLowerCase()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-medium">What they can do</p>
                  <div className="space-y-2">
                    {PARTNER_MANAGER_RESOURCES.map((resource) => {
                      const permission =
                        manager.permissions.find(
                          (item) => item.resource === resource.key
                        ) ?? emptyPermission(resource.key);

                      return (
                        <div
                          key={resource.key}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                        >
                          <span className="text-sm">{resource.label}</span>
                          <div className="flex flex-wrap gap-3">
                            {ACTIONS.map((action) => (
                              <label
                                key={action.key}
                                className="flex items-center gap-1.5 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={permission[action.key]}
                                  disabled={pending}
                                  onChange={(event) =>
                                    togglePermission(
                                      manager,
                                      resource.key,
                                      action.key,
                                      event.target.checked
                                    )
                                  }
                                />
                                {action.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Account status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={pending}
                        title={option.hint}
                        onClick={() => changeStatus(manager, option.value)}
                        className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                          manager.accountStatus === option.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {resetFor === manager.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Input
                        type="text"
                        value={resetPassword}
                        onChange={(event) =>
                          setResetPassword(event.target.value)
                        }
                        placeholder="New password (min 8 characters)"
                        className="h-9 max-w-[260px]"
                      />
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => submitReset(manager)}
                      >
                        Save password
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setResetFor(null);
                          setResetPassword("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResetFor(manager.id);
                          setResetPassword("");
                        }}
                      >
                        <KeyRound className="mr-2 h-3.5 w-3.5" />
                        Reset password
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => remove(manager)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
