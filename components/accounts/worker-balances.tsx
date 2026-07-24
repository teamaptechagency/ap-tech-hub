"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  inviteTeamMember,
  resetTeamMemberPassword,
  updateTeamMemberIdentityStatus,
  updateTeamMemberStatus,
} from "@/actions/settings.actions";
import { startUserImpersonation } from "@/actions/impersonation.actions";
import { adjustWorkerBalance, applyPenalty } from "@/actions/worker.actions";
import { SensitiveDeleteDialog } from "@/components/shared/sensitive-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Trash2 } from "lucide-react";
import { fileViewUrl } from "@/lib/file-url";

type Txn = {
  id: string;
  amount: number;
  bucket: string;
  kind: string;
  note: string | null;
  jobTitle: string | null;
  createdAt: string;
};

type WorkerRow = {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string | null;
  profession?: string | null;
  accountStatus: string;
  identityStatus: string;
  nidNumber?: string | null;
  nidUrl?: string | null;
  photoUrl?: string | null;
  balance: number;
  reserve: number;
  activeJobs: number;
  pendingWithdraw: number;
  txns: Txn[];
};

type CreateRole = "TEAM_MEMBER" | "BUSINESS_PARTNER" | "PARTNER_MANAGER";

type CreateOption = {
  label: string;
  role: CreateRole;
};

const kindLabel: Record<string, string> = {
  JOB_PAYOUT: "Job payout",
  MONTHLY_CREDIT: "Monthly credit",
  HOURLY_CREDIT: "Hourly credit",
  RESERVE_HOLD: "Security hold",
  RESERVE_RELEASE: "Reserve release",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
  PENALTY: "Penalty",
};

function bdt(amount: number) {
  return `BDT ${Math.round(amount).toLocaleString()}`;
}

export function WorkerBalances({
  workers,
  title = "HR / Accounts",
  subtitle = "Employees",
  overviewHref = "/accounts",
  emptyLabel = "No employees yet",
  createLabel,
  createRoles,
  isSuperAdmin = false,
  onDelete,
}: {
  workers: WorkerRow[];
  title?: string;
  subtitle?: string;
  overviewHref?: string;
  emptyLabel?: string;
  createLabel?: string;
  createRoles?: CreateOption[];
  isSuperAdmin?: boolean;
  onDelete?: (userId: string, code: string) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<WorkerRow | null>(
    workers[0] ?? null
  );
  const [dialog, setDialog] = useState<"adjust" | "penalty" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<CreateRole>(
    createRoles?.[0]?.role ?? "TEAM_MEMBER"
  );
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || !dialog) return;
    setError("");
    setBusy(true);
    const result =
      dialog === "adjust"
        ? await adjustWorkerBalance(selected.id, { amount, note })
        : await applyPenalty(selected.id, { amount, note });
    setBusy(false);
    if (result.error) return setError(result.error);
    setDialog(null);
    setAmount("");
    setNote("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await inviteTeamMember({
      name: createName.trim(),
      email: createEmail.trim(),
      role: createRole,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setTempPassword(result.password ?? null);
    router.refresh();
  }

  function resetCreateDialog(open: boolean) {
    if (busy) return;
    setCreateOpen(open);
    if (!open) {
      setCreateName("");
      setCreateEmail("");
      setCreateRole(createRoles?.[0]?.role ?? "TEAM_MEMBER");
      setTempPassword(null);
      setError("");
    }
  }

  async function changeStatus(status: "ACTIVE" | "HOLD" | "LOCKED" | "SUSPENDED") {
    if (!selected) return;
    setError("");
    setBusy(true);
    const result = await updateTeamMemberStatus(selected.id, status);
    setBusy(false);
    if (result.error) return setError(result.error);
    router.refresh();
  }

  async function resetPasswordForSelected() {
    if (!selected) return;
    setError("");
    setBusy(true);
    const result = await resetTeamMemberPassword(selected.id);
    setBusy(false);
    if (result.error) return setError(result.error);
    setResetPassword(result.password ?? null);
  }

  async function changeIdentityStatus(status: "VERIFIED" | "REJECTED" | "PENDING") {
    if (!selected) return;
    setError("");
    setBusy(true);
    const result = await updateTeamMemberIdentityStatus(selected.id, status);
    setBusy(false);
    if (result.error) return setError(result.error);
    router.refresh();
  }

  async function viewAsSelected() {
    if (!selected) return;
    setError("");
    setBusy(true);
    const result = await startUserImpersonation(selected.id);
    setBusy(false);
    if (result.error) return setError(result.error);
    router.push("/profile");
    router.refresh();
  }

  function statusButtonClass(status: "ACTIVE" | "HOLD" | "LOCKED" | "SUSPENDED") {
    if (selected?.accountStatus !== status) return "";
    if (status === "ACTIVE") return "border-green-500 bg-green-500 text-white hover:bg-green-600";
    if (status === "HOLD") return "border-amber-500 bg-amber-500 text-white hover:bg-amber-600";
    if (status === "LOCKED") return "border-slate-500 bg-slate-500 text-white hover:bg-slate-600";
    return "border-red-500 bg-red-500 text-white hover:bg-red-600";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {title}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {subtitle}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {createLabel && createRoles && createRoles.length > 0 && (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              {createLabel}
            </Button>
          )}
          <Link
            href={overviewHref}
            className="text-sm text-primary hover:underline"
          >
            Back to overview
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-2">
          {workers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </CardContent>
            </Card>
          )}
          {workers.map((worker) => (
            <button
              key={worker.id}
              type="button"
              onClick={() => setSelected(worker)}
              className="w-full text-left"
            >
              <Card
                className={
                  selected?.id === worker.id ? "border-2 border-primary" : ""
                }
              >
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {worker.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {worker.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {worker.email ??
                          `${worker.activeJobs} active job${
                            worker.activeJobs !== 1 ? "s" : ""
                          }`}
                      </p>
                      {(worker.phone || worker.profession || worker.role) && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {[worker.phone, worker.profession, worker.role]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{bdt(worker.balance)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      reserve {bdt(worker.reserve)}
                    </p>
                    {worker.pendingWithdraw > 0 && (
                      <p className="text-[10px] text-amber-600">
                        withdraw pending {bdt(worker.pendingWithdraw)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {selected ? (
          <Card className="h-fit">
            <CardContent className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {selected.name} - balance history
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {selected.accountStatus.toLowerCase()}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    ID {selected.identityStatus.toLowerCase()}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAmount("");
                      setNote("");
                      setDialog("adjust");
                    }}
                  >
                    Adjust
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => {
                      setAmount("");
                      setNote("");
                      setDialog("penalty");
                    }}
                  >
                    Penalty
                  </Button>
                  {isSuperAdmin && onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-2 rounded-md border bg-muted/30 p-2">
                <Button size="sm" variant="outline" className={statusButtonClass("ACTIVE")} onClick={() => changeStatus("ACTIVE")} disabled={busy}>
                  {selected.accountStatus === "ACTIVE" ? "Active now" : "Activate"}
                </Button>
                <Button size="sm" variant="outline" className={statusButtonClass("HOLD")} onClick={() => changeStatus("HOLD")} disabled={busy}>
                  {selected.accountStatus === "HOLD" ? "On hold" : "Hold"}
                </Button>
                <Button size="sm" variant="outline" className={statusButtonClass("LOCKED")} onClick={() => changeStatus("LOCKED")} disabled={busy}>
                  {selected.accountStatus === "LOCKED" ? "Locked" : "Lock"}
                </Button>
                <Button size="sm" variant="outline" className={statusButtonClass("SUSPENDED") || "text-red-500 hover:text-red-600"} onClick={() => changeStatus("SUSPENDED")} disabled={busy}>
                  {selected.accountStatus === "SUSPENDED" ? "Suspended" : "Suspend"}
                </Button>
                <Button size="sm" variant="outline" onClick={resetPasswordForSelected} disabled={busy}>
                  Reset password
                </Button>
                {isSuperAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10"
                    onClick={viewAsSelected}
                    disabled={busy}
                  >
                    View as user
                  </Button>
                )}
              </div>
              {resetPassword && (
                <div className="mb-3 rounded-md border bg-muted/50 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Temporary password for {selected.name}
                  </p>
                  <p className="break-all font-mono font-semibold">{resetPassword}</p>
                </div>
              )}
              <div className="mb-3 rounded-md border bg-muted/30 p-3 text-xs">
                <p className="font-medium">Identity documents</p>
                <p className="text-muted-foreground">
                  NID: {selected.nidNumber || "Not added"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.photoUrl && (
                    <Button size="sm" variant="outline" onClick={() => window.open(fileViewUrl(selected.photoUrl), "_blank")}>
                      Open photo
                    </Button>
                  )}
                  {selected.nidUrl && (
                    <Button size="sm" variant="outline" onClick={() => window.open(fileViewUrl(selected.nidUrl), "_blank")}>
                      Open NID
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => changeIdentityStatus("VERIFIED")} disabled={busy}>
                    Verify ID
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => changeIdentityStatus("PENDING")} disabled={busy}>
                    Mark pending
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => changeIdentityStatus("REJECTED")} disabled={busy}>
                    Reject ID
                  </Button>
                </div>
              </div>

              <div className="divide-y">
                {selected.txns.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No transactions yet
                  </p>
                )}
                {selected.txns.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-start justify-between py-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm">
                        {txn.jobTitle ?? kindLabel[txn.kind] ?? txn.kind}
                        {txn.bucket === "RESERVE" && (
                          <Badge
                            variant="secondary"
                            className="ml-2 bg-amber-100 text-[10px] text-amber-700"
                          >
                            reserve
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                        {" / "}
                        {kindLabel[txn.kind] ?? txn.kind}
                        {txn.note && ` / ${txn.note}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium ${
                        txn.amount >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {txn.amount >= 0 ? "+" : "-"}
                      {bdt(Math.abs(txn.amount))}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                Payout rule: fixed jobs credit on completion. Monthly and
                hourly jobs credit at month end. Each credit keeps the reserve
                policy, and penalties deduct balance first.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Select an employee
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "adjust" ? "Adjust balance" : "Apply penalty"} -{" "}
              {selected?.name}
            </DialogTitle>
            <DialogDescription>
              {dialog === "adjust"
                ? "Positive means bonus or credit. Negative means deduction."
                : "Deducted from balance first, then the security reserve."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worker-amount">Amount (BDT)</Label>
              <Input
                id="worker-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={dialog === "adjust" ? "e.g. 5000 or -2000" : "e.g. 3000"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-note">Note (required for audit)</Label>
              <Input
                id="worker-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={dialog === "adjust" ? "e.g. Eid bonus" : "e.g. Job cancel fine"}
                required
              />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              variant={dialog === "penalty" ? "destructive" : "default"}
              disabled={busy}
            >
              {busy
                ? "Saving..."
                : dialog === "adjust"
                  ? "Save adjustment"
                  : "Apply penalty"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={resetCreateDialog}>
        <DialogContent>
          {tempPassword ? (
            <>
              <DialogHeader>
                <DialogTitle>{createLabel?.replace("Add", "New")} created</DialogTitle>
                <DialogDescription>
                  Share these credentials securely. The temporary password is
                  shown only once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-md border bg-muted/50 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="break-all font-mono text-sm">{createEmail}</p>
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
              <Button type="button" onClick={() => resetCreateDialog(false)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{createLabel}</DialogTitle>
                <DialogDescription>
                  A temporary password will be generated and displayed once.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-worker-name">Name</Label>
                  <Input
                    id="create-worker-name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    disabled={busy}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-worker-email">Email</Label>
                  <Input
                    id="create-worker-email"
                    type="email"
                    value={createEmail}
                    onChange={(event) => setCreateEmail(event.target.value)}
                    disabled={busy}
                    required
                  />
                </div>
                {createRoles && createRoles.length > 1 && (
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={createRole}
                      onValueChange={(value) => setCreateRole(value as CreateRole)}
                      disabled={busy}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {createRoles.map((option) => (
                          <SelectItem key={option.role} value={option.role}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {error && (
                  <p className="text-center text-sm text-red-500">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating..." : "Create"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {isSuperAdmin && onDelete && selected && (
        <SensitiveDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={`Delete ${selected.name}?`}
          description="This permanently removes their account and login. Messages they sent and meetings they created are reassigned to you so history isn't lost. This can't be undone."
          onConfirm={(code) => onDelete(selected.id, code)}
          onDeleted={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
