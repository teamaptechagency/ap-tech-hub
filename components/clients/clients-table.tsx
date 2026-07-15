"use client";

import { useState } from "react";
import Link from "next/link";
import { ClientDialog } from "@/components/clients/client-dialog";
import {
  createClientLogin,
  resetClientLogin,
  adjustClientBalance,
  deleteClient,
} from "@/actions/client.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Plus,
  Search,
  Star,
  User,
  Pencil,
  KeyRound,
  RefreshCw,
  Coins,
  Trash2,
} from "lucide-react";

type ClientRow = {
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
  totalJobs: number;
  activeJobs: number;
  hasLogin: boolean;
};

const currencySymbol: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
};

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  // Secondary dialogs
  const [passwordInfo, setPasswordInfo] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [adjusting, setAdjusting] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState<ClientRow | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = clients.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreateLogin(client: ClientRow) {
    const result = await createClientLogin(client.id);
    if (result.error) return alert(result.error);
    if (result.password) {
      setPasswordInfo({ email: client.email, password: result.password });
    }
  }

  async function handleResetLogin(client: ClientRow) {
    const result = await resetClientLogin(client.id);
    if (result.error) return alert(result.error);
    if (result.password) {
      setPasswordInfo({ email: client.email, password: result.password });
    }
  }

  async function handleAdjust(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!adjusting) return;
    setError("");
    setBusy(true);
    const result = await adjustClientBalance(adjusting.id, { amount, note });
    setBusy(false);
    if (result.error) return setError(result.error);
    setAdjusting(null);
    setAmount("");
    setNote("");
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    await deleteClient(deleting.id);
    setBusy(false);
    setDeleting(null);
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} total ·{" "}
            {clients.filter((c) => c.status === "ACTIVE").length} active
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-56 pl-8"
            />
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add client
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {clients.length === 0
                      ? 'No clients yet — click "Add client" to create the first one'
                      : "No clients match your search"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {client.companyName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {client.email}
                        {client.hasLogin && " · portal ✓"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {client.totalJobs}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({client.activeJobs} active)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {client.balance > 0 ? (
                        <span className="font-medium text-green-600">
                          +{currencySymbol[client.currency]}
                          {client.balance.toFixed(2)}
                        </span>
                      ) : client.balance < 0 ? (
                        <span className="font-medium text-red-500">
                          −{currencySymbol[client.currency]}
                          {Math.abs(client.balance).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {client.balance > 0
                          ? "advance"
                          : client.balance < 0
                            ? "due"
                            : "settled"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 font-medium">
                        {client.points.toLocaleString()}
                        <Star className="h-3 w-3 text-amber-500" />
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        ≈ ${(client.points / 100).toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          client.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }
                      >
                        {client.status === "ACTIVE" ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            render={
                              <Link href={`/clients/${client.id}`}>
                                <User className="mr-2 h-4 w-4" />
                                View profile
                              </Link>
                            }
                          />
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(client);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {!client.hasLogin ? (
                            <DropdownMenuItem
                              onClick={() => handleCreateLogin(client)}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Create login
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleResetLogin(client)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reset login
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setAdjusting(client)}
                          >
                            <Coins className="mr-2 h-4 w-4" />
                            Adjust balance
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => setDeleting(client)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit dialog — key forces remount so edit values load fresh */}
      {dialogOpen && (
        <ClientDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          client={editing}
        />
      )}

      {/* Temp password dialog */}
      <Dialog
        open={passwordInfo !== null}
        onOpenChange={(o) => !o && setPasswordInfo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portal login credentials</DialogTitle>
            <DialogDescription>
              Share these with the client — this password is shown only once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-md bg-muted p-4 font-mono text-sm">
            <p>Email: {passwordInfo?.email}</p>
            <p>Password: {passwordInfo?.password}</p>
          </div>
          <Button onClick={() => setPasswordInfo(null)}>Done</Button>
        </DialogContent>
      </Dialog>

      {/* Adjust balance dialog */}
      <Dialog
        open={adjusting !== null}
        onOpenChange={(o) => !o && setAdjusting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adjust balance — {adjusting?.companyName}
            </DialogTitle>
            <DialogDescription>
              Positive = advance credit · Negative = due. Recorded in the
              wallet ledger.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount ({adjusting?.currency})
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 120 or -450"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Advance via bank transfer"
              />
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save adjustment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.companyName}?</DialogTitle>
            <DialogDescription>
              This permanently removes the client, their portal login, and
              related records. Consider archiving instead — history stays for
              accounting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}