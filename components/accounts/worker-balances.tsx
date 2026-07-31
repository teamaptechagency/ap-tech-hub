"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  inviteTeamMember,
  resetTeamMemberPassword,
  updateEmployeeCompensation,
  updatePartnerAccount,
  updateTeamMemberIdentityStatus,
  updateTeamMemberStatus,
} from "@/actions/settings.actions";
import { startUserImpersonation } from "@/actions/impersonation.actions";
import {
  adjustWorkerBalance,
  applyPenalty,
  paySalary,
} from "@/actions/worker.actions";
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
import { Textarea } from "@/components/ui/textarea";
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
  partnerType?: string | null;
  managedByPartner?: { id: string; name: string; email: string } | null;
  email?: string;
  phone?: string | null;
  profession?: string | null;
  businessBrief?: string | null;
  accountStatus: string;
  identityStatus: string;
  nidNumber?: string | null;
  nidUrl?: string | null;
  photoUrl?: string | null;
  balance: number;
  reserve: number;
  providentFund?: number;
  activeJobs: number;
  pendingWithdraw: number;
  txns: Txn[];
  compensationType?: "PER_JOB" | "MONTHLY_SALARY";
  monthlySalaryAmount?: number | null;
  monthlyTargetUsd?: number | null;
  bonusPerHundredUsd?: number | null;
  achievedUsdThisMonth?: number | null;
  usdBonusEarned?: number;
};

type CreateRole =
  | "TEAM_MEMBER"
  | "BUSINESS_PARTNER"
  | "PARTNER_MANAGER"
  | "REFERRAL_PARTNER";

type PartnerType =
  | "SO_PARTNER"
  | "REFERENCE_PARTNER"
  | "REGULAR_CONTRACT_PARTNER";

type CreateOption = {
  label: string;
  role: CreateRole;
  partnerType?: PartnerType;
};

type ManagerOwnerOption = {
  id: string;
  name: string;
  email: string;
  partnerType?: string | null;
};

const kindLabel: Record<string, string> = {
  JOB_PAYOUT: "Job payout",
  MONTHLY_CREDIT: "Monthly credit",
  HOURLY_CREDIT: "Hourly credit",
  RESERVE_HOLD: "Security hold",
  RESERVE_RELEASE: "Reserve release",
  SALARY_PAYOUT: "Salary payout",
  PF_CONTRIBUTION: "Provident fund",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
  PENALTY: "Penalty",
};

/** Employee-list-only label — organizationally the super admin is the CEO. */
function displayRole(worker: { role?: string }) {
  if (worker.role === "SUPER_ADMIN") return "CEO";
  return worker.role;
}

const partnerTypeLabel: Record<string, string> = {
  SO_PARTNER: "SO partner",
  REFERENCE_PARTNER: "Reference partner",
  REGULAR_CONTRACT_PARTNER: "Regular contract partner",
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
  managerOwners = [],
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
  managerOwners?: ManagerOwnerOption[];
  isSuperAdmin?: boolean;
  onDelete?: (userId: string, code: string) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<WorkerRow | null>(
    workers[0] ?? null
  );
  const [dialog, setDialog] = useState<"adjust" | "penalty" | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [compensationOpen, setCompensationOpen] = useState(false);
  const [paySalaryOpen, setPaySalaryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [compensationDraft, setCompensationDraft] = useState({
    compensationType: workers[0]?.compensationType ?? "PER_JOB",
    monthlySalaryAmount: workers[0]?.monthlySalaryAmount
      ? String(workers[0].monthlySalaryAmount)
      : "",
    monthlyTargetUsd: workers[0]?.monthlyTargetUsd
      ? String(workers[0].monthlyTargetUsd)
      : "",
    bonusPerHundredUsd: workers[0]?.bonusPerHundredUsd
      ? String(workers[0].bonusPerHundredUsd)
      : "",
  });
  const [profileDraft, setProfileDraft] = useState({
    partnerType: workers[0]?.partnerType ?? "SO_PARTNER",
    managedByPartnerId: workers[0]?.managedByPartner?.id ?? "",
    phone: workers[0]?.phone ?? "",
    profession: workers[0]?.profession ?? "",
    businessBrief: workers[0]?.businessBrief ?? "",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createType, setCreateType] = useState(
    createRoles?.[0]
      ? `${createRoles[0].role}:${createRoles[0].partnerType ?? ""}`
      : "TEAM_MEMBER:"
  );
  const selectedCreateOption =
    createRoles?.find(
      (option) =>
        `${option.role}:${option.partnerType ?? ""}` === createType
    ) ?? createRoles?.[0];
  const [ownerPartnerId, setOwnerPartnerId] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredWorkers = workers.filter((worker) => {
    const keyword = search.trim().toLowerCase();
    const haystack = [
      worker.name,
      worker.email ?? "",
      worker.phone ?? "",
      worker.profession ?? "",
      worker.partnerType ?? "",
      worker.role ?? "",
      worker.managedByPartner?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !keyword || haystack.includes(keyword);
    const matchesType =
      typeFilter === "ALL" ||
      (typeFilter === "MANAGER" && worker.role === "PARTNER_MANAGER") ||
      worker.partnerType === typeFilter;
    const matchesStatus =
      statusFilter === "ALL" || worker.accountStatus === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Salaried employees don't work project-wise, so their balance sheet is
  // kept visually separate from freelancers here rather than mixed in —
  // only kicks in on pages that actually have monthly-salary employees
  // (the partners page has none, so this is a no-op there).
  const hasSalaried = filteredWorkers.some(
    (worker) => worker.compensationType === "MONTHLY_SALARY"
  );
  const orderedWorkers = hasSalaried
    ? [...filteredWorkers].sort((a, b) => {
        const aSalaried = a.compensationType === "MONTHLY_SALARY" ? 0 : 1;
        const bSalaried = b.compensationType === "MONTHLY_SALARY" ? 0 : 1;
        return aSalaried - bSalaried;
      })
    : filteredWorkers;

  function selectWorker(worker: WorkerRow) {
    setSelected(worker);
    setResetPassword(null);
    setError("");
    setProfileDraft({
      partnerType: worker.partnerType ?? "SO_PARTNER",
      managedByPartnerId: worker.managedByPartner?.id ?? "",
      phone: worker.phone ?? "",
      profession: worker.profession ?? "",
      businessBrief: worker.businessBrief ?? "",
    });
    setCompensationDraft({
      compensationType: worker.compensationType ?? "PER_JOB",
      monthlySalaryAmount: worker.monthlySalaryAmount
        ? String(worker.monthlySalaryAmount)
        : "",
      monthlyTargetUsd: worker.monthlyTargetUsd
        ? String(worker.monthlyTargetUsd)
        : "",
      bonusPerHundredUsd: worker.bonusPerHundredUsd
        ? String(worker.bonusPerHundredUsd)
        : "",
    });
  }

  async function saveCompensation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setError("");
    setBusy(true);
    const result = await updateEmployeeCompensation(selected.id, {
      compensationType: compensationDraft.compensationType as
        | "PER_JOB"
        | "MONTHLY_SALARY",
      monthlySalaryAmount: compensationDraft.monthlySalaryAmount,
      monthlyTargetUsd: compensationDraft.monthlyTargetUsd,
      bonusPerHundredUsd: compensationDraft.bonusPerHundredUsd,
    });
    setBusy(false);

    if (result.error) return setError(result.error);
    setCompensationOpen(false);
    router.refresh();
  }

  async function handlePaySalary() {
    if (!selected) return;
    setError("");
    setBusy(true);
    const result = await paySalary(selected.id);
    setBusy(false);
    if (result.error) return setError(result.error);
    setPaySalaryOpen(false);
    router.refresh();
  }

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
      role: selectedCreateOption?.role ?? "TEAM_MEMBER",
      partnerType: selectedCreateOption?.partnerType,
      managedByPartnerId:
        selectedCreateOption?.role === "PARTNER_MANAGER"
          ? ownerPartnerId
          : undefined,
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
      setCreateType(
        createRoles?.[0]
          ? `${createRoles[0].role}:${createRoles[0].partnerType ?? ""}`
          : "TEAM_MEMBER:"
      );
      setOwnerPartnerId("");
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

  async function saveProfileControl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setError("");
    setBusy(true);
    const result = await updatePartnerAccount({
      userId: selected.id,
      partnerType: profileDraft.partnerType as PartnerType,
      managedByPartnerId:
        selected.role === "PARTNER_MANAGER"
          ? profileDraft.managedByPartnerId
          : undefined,
      phone: profileDraft.phone,
      profession: profileDraft.profession,
      businessBrief: profileDraft.businessBrief,
    });
    setBusy(false);

    if (result.error) return setError(result.error);
    setProfileOpen(false);
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

      <div className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[1fr_180px_180px]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search partner, manager, email, phone or type"
        />
        <Select
          value={typeFilter}
          onValueChange={(value) => value && setTypeFilter(value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="SO_PARTNER">SO partner</SelectItem>
            <SelectItem value="REFERENCE_PARTNER">Reference partner</SelectItem>
            <SelectItem value="REGULAR_CONTRACT_PARTNER">
              Regular contract
            </SelectItem>
            <SelectItem value="MANAGER">Managers</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => value && setStatusFilter(value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="HOLD">Hold</SelectItem>
            <SelectItem value="LOCKED">Locked</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-2">
          {filteredWorkers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </CardContent>
            </Card>
          )}
          {orderedWorkers.map((worker, index) => {
            const previous = orderedWorkers[index - 1];
            const isSalaried = worker.compensationType === "MONTHLY_SALARY";
            const showSalariedHeader =
              hasSalaried &&
              isSalaried &&
              (!previous || previous.compensationType !== "MONTHLY_SALARY");
            const showProjectHeader =
              hasSalaried &&
              !isSalaried &&
              (!previous || previous.compensationType === "MONTHLY_SALARY");

            return (
              <Fragment key={worker.id}>
                {showSalariedHeader && (
                  <p className="px-1 pt-1 text-xs font-semibold uppercase text-muted-foreground">
                    Salaried
                  </p>
                )}
                {showProjectHeader && (
                  <p className="px-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">
                    Project-wise
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => selectWorker(worker)}
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
                          {[
                            worker.phone,
                            worker.profession,
                            worker.partnerType
                              ? partnerTypeLabel[worker.partnerType] ??
                                worker.partnerType
                              : displayRole(worker),
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      )}
                      {worker.managedByPartner ? (
                        <p className="truncate text-[10px] text-muted-foreground">
                          Manager for {worker.managedByPartner.name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{bdt(worker.balance)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isSalaried
                        ? `PF ${bdt(worker.providentFund ?? 0)}`
                        : `reserve ${bdt(worker.reserve)}`}
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
              </Fragment>
            );
          })}
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
                  {selected.partnerType ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {partnerTypeLabel[selected.partnerType] ??
                        selected.partnerType}
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="text-[10px]">
                    ID {selected.identityStatus.toLowerCase()}
                  </Badge>
                  {(selected.role === "TEAM_MEMBER" ||
                    selected.role === "SUPER_ADMIN") && (
                    <Badge variant="secondary" className="text-[10px]">
                      {selected.compensationType === "MONTHLY_SALARY"
                        ? `salary ${bdt(selected.monthlySalaryAmount ?? 0)}/mo`
                        : "per job"}
                    </Badge>
                  )}
                  {selected.compensationType === "MONTHLY_SALARY" &&
                    selected.monthlyTargetUsd != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        target ${selected.monthlyTargetUsd} · this month $
                        {selected.achievedUsdThisMonth ?? 0}
                      </Badge>
                    )}
                  {(selected.usdBonusEarned ?? 0) > 0 && (
                    <Badge className="bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                      bonus earned {bdt(selected.usdBonusEarned ?? 0)}
                    </Badge>
                  )}
                  {selected.compensationType === "MONTHLY_SALARY" &&
                    (selected.providentFund ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        PF {bdt(selected.providentFund ?? 0)}
                      </Badge>
                    )}
                  {(selected.role === "TEAM_MEMBER" ||
                    selected.role === "SUPER_ADMIN") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        selectWorker(selected);
                        setCompensationOpen(true);
                      }}
                    >
                      Compensation
                    </Button>
                  )}
                  {selected.compensationType === "MONTHLY_SALARY" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => {
                        setError("");
                        setPaySalaryOpen(true);
                      }}
                    >
                      Pay salary
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      selectWorker(selected);
                      setProfileOpen(true);
                    }}
                  >
                    Profile control
                  </Button>
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
                  {isSuperAdmin && onDelete && selected.role !== "SUPER_ADMIN" && (
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
                {selected.role !== "SUPER_ADMIN" && (
                  <>
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
                  </>
                )}
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
              {selected.managedByPartner ? (
                <div className="mb-3 rounded-md border bg-muted/30 p-3 text-xs">
                  <p className="font-medium">Manager assignment</p>
                  <p className="text-muted-foreground">
                    This manager belongs to {selected.managedByPartner.name} (
                    {selected.managedByPartner.email}).
                  </p>
                </div>
              ) : null}
              {selected.businessBrief ? (
                <div className="mb-3 rounded-md border bg-muted/30 p-3 text-xs">
                  <p className="font-medium">Business brief</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {selected.businessBrief}
                  </p>
                </div>
              ) : null}
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
                        {txn.bucket === "PROVIDENT_FUND" && (
                          <Badge
                            variant="secondary"
                            className="ml-2 bg-emerald-100 text-[10px] text-emerald-700"
                          >
                            provident fund
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

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner profile control</DialogTitle>
            <DialogDescription>
              Control the partner type, manager assignment and public business
              profile details for {selected?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProfileControl} className="space-y-4">
            <div className="space-y-2">
              <Label>Partner type</Label>
              <Select
                value={profileDraft.partnerType}
                onValueChange={(value) =>
                  value &&
                  setProfileDraft((current) => ({
                    ...current,
                    partnerType: value,
                  }))
                }
                disabled={busy || selected?.role === "PARTNER_MANAGER"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SO_PARTNER">SO partner</SelectItem>
                  <SelectItem value="REFERENCE_PARTNER">
                    Reference partner
                  </SelectItem>
                  <SelectItem value="REGULAR_CONTRACT_PARTNER">
                    Regular contract partner
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selected?.role === "PARTNER_MANAGER" && (
              <div className="space-y-2">
                <Label>Manager for</Label>
                <Select
                  value={profileDraft.managedByPartnerId}
                  onValueChange={(value) =>
                    value &&
                    setProfileDraft((current) => ({
                      ...current,
                      managedByPartnerId: value,
                    }))
                  }
                  disabled={busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {managerOwners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name} -{" "}
                        {owner.partnerType
                          ? partnerTypeLabel[owner.partnerType] ??
                            owner.partnerType
                          : "Partner"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={profileDraft.phone}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label>Profession / contract note</Label>
                <Input
                  value={profileDraft.profession}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      profession: event.target.value,
                    }))
                  }
                  disabled={busy}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business brief</Label>
              <Textarea
                value={profileDraft.businessBrief}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    businessBrief: event.target.value,
                  }))
                }
                disabled={busy}
                className="min-h-28"
                placeholder="What this partner does, contract terms, or internal notes."
              />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save profile control"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={compensationOpen} onOpenChange={setCompensationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compensation - {selected?.name}</DialogTitle>
            <DialogDescription>
              Per job pays out through the normal job/payout flow. Monthly
              salary is fixed regardless of job — payment is still made
              manually, this just records the terms.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCompensation} className="space-y-4">
            <div className="space-y-2">
              <Label>Pay type</Label>
              <Select
                value={compensationDraft.compensationType}
                onValueChange={(value) =>
                  value &&
                  setCompensationDraft((current) => ({
                    ...current,
                    compensationType: value as "PER_JOB" | "MONTHLY_SALARY",
                  }))
                }
                disabled={busy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_JOB">Per job / project</SelectItem>
                  <SelectItem value="MONTHLY_SALARY">
                    Monthly salary
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {compensationDraft.compensationType === "MONTHLY_SALARY" && (
              <div className="space-y-2">
                <Label htmlFor="monthly-salary-amount">
                  Monthly salary (BDT)
                </Label>
                <Input
                  id="monthly-salary-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={compensationDraft.monthlySalaryAmount}
                  onChange={(event) =>
                    setCompensationDraft((current) => ({
                      ...current,
                      monthlySalaryAmount: event.target.value,
                    }))
                  }
                  disabled={busy}
                  required
                />
              </div>
            )}
            {compensationDraft.compensationType === "MONTHLY_SALARY" && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Optional: set a monthly USD target. Crossing it earns a BDT
                  bonus at the rate below, credited manually via Adjust.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthly-target-usd">
                      Monthly target (USD)
                    </Label>
                    <Input
                      id="monthly-target-usd"
                      type="number"
                      min="0"
                      step="0.01"
                      value={compensationDraft.monthlyTargetUsd}
                      onChange={(event) =>
                        setCompensationDraft((current) => ({
                          ...current,
                          monthlyTargetUsd: event.target.value,
                        }))
                      }
                      disabled={busy}
                      placeholder="e.g. 1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus-per-100-usd">
                      Bonus per 100 USD over (BDT)
                    </Label>
                    <Input
                      id="bonus-per-100-usd"
                      type="number"
                      min="0"
                      step="0.01"
                      value={compensationDraft.bonusPerHundredUsd}
                      onChange={(event) =>
                        setCompensationDraft((current) => ({
                          ...current,
                          bonusPerHundredUsd: event.target.value,
                        }))
                      }
                      disabled={busy}
                      placeholder="e.g. 1000"
                    />
                  </div>
                </div>
              </div>
            )}
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save compensation"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={paySalaryOpen} onOpenChange={setPaySalaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay salary - {selected?.name}</DialogTitle>
            <DialogDescription>
              Splits automatically: 80% to spendable balance, 20% to the
              locked provident fund. Blocked if this month is already paid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monthly salary</span>
              <span className="font-medium">
                {bdt(selected?.monthlySalaryAmount ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">To balance (80%)</span>
              <span className="font-medium text-green-600">
                +{bdt((selected?.monthlySalaryAmount ?? 0) * 0.8)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                To provident fund (20%)
              </span>
              <span className="font-medium">
                +{bdt((selected?.monthlySalaryAmount ?? 0) * 0.2)}
              </span>
            </div>
          </div>
          {error && <p className="text-center text-sm text-red-500">{error}</p>}
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={handlePaySalary}
          >
            {busy ? "Paying..." : "Confirm payment"}
          </Button>
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
                    <Label>Partner type</Label>
                    <Select
                      value={createType}
                      onValueChange={(value) => {
                        if (!value) return;
                        setCreateType(value);
                        setOwnerPartnerId("");
                      }}
                      disabled={busy}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {createRoles.map((option) => (
                          <SelectItem
                            key={`${option.role}:${option.partnerType ?? ""}`}
                            value={`${option.role}:${option.partnerType ?? ""}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {selectedCreateOption?.role === "PARTNER_MANAGER" && (
                  <div className="space-y-2">
                    <Label>Manager for</Label>
                    <Select
                      value={ownerPartnerId}
                      onValueChange={(value) => {
                        if (value) setOwnerPartnerId(value);
                      }}
                      disabled={busy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select partner owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {managerOwners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name} -{" "}
                            {owner.partnerType
                              ? partnerTypeLabel[owner.partnerType] ??
                                owner.partnerType
                              : "Partner"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The manager will only belong to this selected partner.
                    </p>
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
