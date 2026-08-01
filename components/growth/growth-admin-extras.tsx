"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { inviteTeamMember } from "@/actions/settings.actions";
import { logGrowthExpense } from "@/actions/growth.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = { id: string; name: string };
type Expense = {
  id: string;
  title: string;
  description: string | null;
  amountBdt: number;
  createdAt: string;
};

function bdt(amount: number) {
  return `BDT ${Math.round(amount).toLocaleString()}`;
}

export function GrowthMembersPanel({ members }: { members: Member[] }) {
  const router = useRouter();

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [invitingMember, setInvitingMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleInviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvitingMember(true);
    setMemberError("");
    const result = await inviteTeamMember({
      name: memberName.trim(),
      email: memberEmail.trim(),
      role: "GROWTH_MEMBER",
    });
    setInvitingMember(false);
    if (result.error) return setMemberError(result.error);
    setTempPassword(result.password ?? null);
    setMemberName("");
    setMemberEmail("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Growth Roadmap members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">No members yet</p>
          )}
          {members.map((member) => (
            <span
              key={member.id}
              className="rounded-full border bg-primary/5 px-3 py-1 text-sm"
            >
              {member.name}
            </span>
          ))}
        </div>

        {tempPassword ? (
          <div className="space-y-2 rounded-md border bg-muted/50 p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Temporary password — shown only once, share it securely.
            </p>
            <p className="break-all font-mono font-semibold">{tempPassword}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setTempPassword(null)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleInviteMember} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="growth-member-name">Name</Label>
              <Input
                id="growth-member-name"
                value={memberName}
                onChange={(event) => setMemberName(event.target.value)}
                disabled={invitingMember}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="growth-member-email">Email</Label>
              <Input
                id="growth-member-email"
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                disabled={invitingMember}
                required
              />
            </div>
            {memberError && (
              <p className="text-center text-sm text-red-500">{memberError}</p>
            )}
            <Button type="submit" className="w-full" disabled={invitingMember}>
              {invitingMember ? "Adding..." : "Add member"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function GrowthExpensesPanel({
  expenses,
  expenseTotal,
}: {
  expenses: Expense[];
  expenseTotal: number;
}) {
  const router = useRouter();

  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState("");

  async function handleLogExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingExpense(true);
    setExpenseError("");
    const result = await logGrowthExpense({
      title: expenseTitle,
      amountBdt: expenseAmount,
      note: expenseNote,
    });
    setSavingExpense(false);
    if ("error" in result) return setExpenseError(result.error);
    setExpenseTitle("");
    setExpenseAmount("");
    setExpenseNote("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Roadmap expenses</span>
          <span className="text-sm font-normal text-muted-foreground">
            Total {bdt(expenseTotal)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleLogExpense} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="growth-expense-title">Title</Label>
            <Input
              id="growth-expense-title"
              value={expenseTitle}
              onChange={(event) => setExpenseTitle(event.target.value)}
              disabled={savingExpense}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="growth-expense-amount">Amount (BDT)</Label>
            <Input
              id="growth-expense-amount"
              type="number"
              min="0"
              step="0.01"
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              disabled={savingExpense}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="growth-expense-note">Note</Label>
            <Input
              id="growth-expense-note"
              value={expenseNote}
              onChange={(event) => setExpenseNote(event.target.value)}
              disabled={savingExpense}
            />
          </div>
          {expenseError && (
            <p className="text-center text-sm text-red-500 sm:col-span-2">
              {expenseError}
            </p>
          )}
          <Button
            type="submit"
            className="sm:col-span-2"
            disabled={savingExpense}
          >
            {savingExpense ? "Saving..." : "Log expense"}
          </Button>
        </form>

        <div className="divide-y">
          {expenses.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No expenses logged yet.
            </p>
          )}
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-start justify-between py-2 text-sm"
            >
              <div className="min-w-0 pr-3">
                <p className="font-medium">{expense.title}</p>
                {expense.description && (
                  <p className="text-xs text-muted-foreground">
                    {expense.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-medium">
                {bdt(expense.amountBdt)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
