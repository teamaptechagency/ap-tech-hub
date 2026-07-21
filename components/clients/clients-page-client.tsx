"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  archiveClient,
  createClientLogin,
  deleteClient,
  resetClientLogin,
} from "@/actions/client.actions";

import { ClientDialog } from "@/components/clients/client-dialog";
import { SensitiveDeleteDialog } from "@/components/shared/sensitive-delete-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import {
  Archive,
  Briefcase,
  Building2,
  Coins,
  FileText,
  Globe2,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

export type ClientListItem = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  status: string;
  balance: number;
  points: number;
  createdAt: string;

  hasLogin: boolean;
  loginEmail: string | null;
  loginRole: string | null;

  jobCount: number;
  invoiceCount: number;
};

type TemporaryCredentials = {
  title: string;
  email: string;
  password: string;
};

type ClientsPageClientProps = {
  clients: ClientListItem[];
  isSuperAdmin: boolean;
};

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

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatRole(role: string | null) {
  if (!role) return "";

  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function ClientsPageClient({
  clients,
  isSuperAdmin,
}: ClientsPageClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] =
    useState<ClientListItem | null>(null);

  const [credentials, setCredentials] =
    useState<TemporaryCredentials | null>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientListItem | null>(
    null
  );

  const activeClients = clients.filter(
    (client) => client.status !== "ARCHIVED"
  );

  const archivedClients = clients.filter(
    (client) => client.status === "ARCHIVED"
  );

  const filteredClients = useMemo(() => {
    const source = showArchived ? archivedClients : activeClients;
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return source;
    }

    return source.filter((client) => {
      return [
        client.companyName,
        client.contactName,
        client.email,
        client.phone ?? "",
        client.country ?? "",
      ].some((value) => value.toLowerCase().includes(keyword));
    });
  }, [activeClients, archivedClients, search, showArchived]);

  function openCreateDialog() {
    setEditingClient(null);
    setClientDialogOpen(true);
  }

  function openEditDialog(client: ClientListItem) {
    setEditingClient(client);
    setClientDialogOpen(true);
  }

  function handleClientDialogChange(open: boolean) {
    setClientDialogOpen(open);

    if (!open) {
      setEditingClient(null);
      router.refresh();
    }
  }

  async function handleCreateLogin(client: ClientListItem) {
    const actionKey = `create-login-${client.id}`;

    if (busyAction) return;

    setBusyAction(actionKey);

    try {
      const result = await createClientLogin(client.id);
      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      const password = getActionPassword(result);

      if (!password) {
        toast.error("Temporary password was not returned.");
        return;
      }

      setCredentials({
        title: "Portal login created",
        email: client.email,
        password,
      });

      toast.success("Client portal login created.");
      router.refresh();
    } catch (error) {
      console.error("Create client login failed:", error);
      toast.error("Client login could not be created.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResetLogin(client: ClientListItem) {
    const confirmed = window.confirm(
      `Generate a new temporary password for ${client.companyName}?`
    );

    if (!confirmed || busyAction) return;

    const actionKey = `reset-login-${client.id}`;
    setBusyAction(actionKey);

    try {
      const result = await resetClientLogin(client.id);
      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      const password = getActionPassword(result);

      if (!password) {
        toast.error("Temporary password was not returned.");
        return;
      }

      setCredentials({
        title: "Portal login reset",
        email: client.loginEmail ?? client.email,
        password,
      });

      toast.success("Client login password reset.");
      router.refresh();
    } catch (error) {
      console.error("Reset client login failed:", error);
      toast.error("Client login could not be reset.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleArchive(client: ClientListItem) {
    const confirmed = window.confirm(
      `Archive ${client.companyName}? The client will be hidden from the active list.`
    );

    if (!confirmed || busyAction) return;

    const actionKey = `archive-${client.id}`;
    setBusyAction(actionKey);

    try {
      const result = await archiveClient(client.id);
      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Client archived.");
      router.refresh();
    } catch (error) {
      console.error("Archive client failed:", error);
      toast.error("Client could not be archived.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteConfirmed(code: string) {
    if (!deleteTarget) return { error: "No client selected" };

    try {
      const result = await deleteClient(deleteTarget.id, code);
      const error = getActionError(result);

      if (error) return { error };

      toast.success("Client deleted permanently.");
      router.refresh();
      return {};
    } catch (error) {
      console.error("Delete client failed:", error);
      return {
        error: "Client could not be deleted. Related records may still exist.",
      };
    }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>

          <p className="text-sm text-muted-foreground">
            Manage clients, portal access, balances and account details.
          </p>
        </div>

        <Button type="button" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add client
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Building2 className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Active clients
              </p>
              <p className="text-lg font-bold">{activeClients.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
              <KeyRound className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Portal logins
              </p>
              <p className="text-lg font-bold">
                {clients.filter((client) => client.hasLogin).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Briefcase className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Client jobs
              </p>
              <p className="text-lg font-bold">
                {clients.reduce(
                  (total, client) => total + client.jobCount,
                  0
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Archive className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Archived
              </p>
              <p className="text-lg font-bold">
                {archivedClients.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={!showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(false)}
          >
            Active ({activeClients.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(true)}
          >
            Archived ({archivedClients.length})
          </Button>
        </div>
      </div>

      {/* Client list */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />

            <p className="mt-3 font-medium">
              {search
                ? "No clients match your search"
                : showArchived
                  ? "No archived clients"
                  : "No clients have been added"}
            </p>

            {!search && !showArchived && (
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add first client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredClients.map((client) => {
            const createLoginBusy =
              busyAction === `create-login-${client.id}`;

            const resetLoginBusy =
              busyAction === `reset-login-${client.id}`;

            const archiveBusy =
              busyAction === `archive-${client.id}`;

            return (
              <Card
                key={client.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/clients/${client.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/clients/${client.id}`);
                  }
                }}
                className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/20"
              >
                <CardHeader className="pb-2 pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {client.companyName}
                      </CardTitle>

                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <UserRound className="h-3.5 w-3.5" />
                        {client.contactName}
                      </p>
                    </div>

                    <Badge
                      variant={
                        client.status === "ARCHIVED"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {client.status.toLowerCase()}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-4">
                  {/* Contact details */}
                  <div className="grid gap-1.5 text-xs sm:grid-cols-2">
                    <p className="flex min-w-0 items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{client.email}</span>
                    </p>

                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{client.phone || "No phone"}</span>
                    </p>

                    <p className="flex items-center gap-2">
                      <Globe2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{client.country || "No country"}</span>
                    </p>

                    <p className="text-muted-foreground">
                      {client.timezone} · {client.currency}
                    </p>
                  </div>

                  {/* Client statistics */}
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <div className="rounded-md bg-muted/50 p-1.5">
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        Jobs
                      </p>
                      <p className="font-semibold">{client.jobCount}</p>
                    </div>

                    <div className="rounded-md bg-muted/50 p-1.5">
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Invoices
                      </p>
                      <p className="font-semibold">
                        {client.invoiceCount}
                      </p>
                    </div>

                    <div className="rounded-md bg-muted/50 p-1.5">
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <WalletCards className="h-3 w-3" />
                        Balance
                      </p>
                      <p className="truncate font-semibold">
                        {formatCurrency(
                          client.balance,
                          client.currency
                        )}
                      </p>
                    </div>

                    <div className="rounded-md bg-muted/50 p-1.5">
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Coins className="h-3 w-3" />
                        Points
                      </p>
                      <p className="font-semibold">
                        {client.points.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Portal access */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div>
                      <p className="text-xs font-medium">
                        Portal access
                      </p>

                      {client.hasLogin ? (
                        <p className="text-xs text-muted-foreground">
                          {client.loginEmail} ·{" "}
                          {formatRole(client.loginRole)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No login account created
                        </p>
                      )}
                    </div>

                    {client.hasLogin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busyAction)}
                        onClick={() => handleResetLogin(client)}
                      >
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        {resetLoginBusy
                          ? "Resetting..."
                          : "Reset login"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busyAction)}
                        onClick={() => handleCreateLogin(client)}
                      >
                        <KeyRound className="mr-2 h-3.5 w-3.5" />
                        {createLoginBusy
                          ? "Creating..."
                          : "Create login"}
                      </Button>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex flex-wrap gap-2 border-t pt-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(client)}
                      disabled={Boolean(busyAction)}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    {client.status !== "ARCHIVED" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleArchive(client)}
                        disabled={Boolean(busyAction)}
                      >
                        <Archive className="mr-2 h-3.5 w-3.5" />
                        {archiveBusy ? "Archiving..." : "Archive"}
                      </Button>
                    )}

                    {isSuperAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(client)}
                        disabled={Boolean(busyAction)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create and edit dialog */}
      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={handleClientDialogChange}
        client={editingClient}
      />

      {/* Temporary credentials dialog */}
      <Dialog
        open={credentials !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCredentials(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {credentials?.title ?? "Portal credentials"}
            </DialogTitle>

            <DialogDescription>
              Copy and share these credentials securely. The temporary
              password is shown only once.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-3 rounded-md border bg-muted/50 p-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Email
                </p>
                <p className="break-all font-mono text-sm">
                  {credentials.email}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Temporary password
                </p>
                <p className="break-all font-mono text-sm font-semibold">
                  {credentials.password}
                </p>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={() => setCredentials(null)}
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete client — super admin + verification code required */}
      {deleteTarget && (
        <SensitiveDeleteDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete ${deleteTarget.companyName}?`}
          description="This permanently removes the client, their portal users and related records. Consider archiving instead — history stays for accounting."
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}
