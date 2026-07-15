"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: string
) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId, meta },
  });
}

// Convert to BDT using Settings rates
async function toBdt(amount: number, currency: string) {
  if (currency === "BDT") return amount;
  const rate = await prisma.exchangeRate.findUnique({
    where: { code: currency },
  });
  return amount * Number(rate?.rateToBdt ?? 120);
}

// ============================================
// ADD CUSTOM EARNING
// ============================================
export async function addCustomEarning(formData: {
  title: string;
  description?: string;
  amount: string;
  currency: "USD" | "EUR" | "GBP" | "BDT";
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.title || formData.title.length < 2) {
    return { error: "Title is required" };
  }
  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter a valid amount" };
  }

  const amountBdt = await toBdt(amount, formData.currency);

  const earning = await prisma.earning.create({
    data: {
      title: formData.title,
      description: formData.description || null,
      amount,
      currency: formData.currency,
      amountBdt,
      source: "CUSTOM",
      createdById: session.user.id,
    },
  });

  await audit(
    session.user.id,
    "EARNING_ADDED",
    "Earning",
    earning.id,
    `${formData.currency} ${amount} = ৳${amountBdt.toFixed(0)}`
  );

  revalidatePath("/accounts");
  revalidatePath("/accounts/earnings");
  return { success: true };
}

// ============================================
// ADD EXPENSE (optional recurring)
// ============================================
export async function addExpense(formData: {
  title: string;
  description?: string;
  amount: string;
  currency: "USD" | "EUR" | "GBP" | "BDT";
  category: string;
  recurring: boolean;
  recurringDay?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.title || formData.title.length < 2) {
    return { error: "Title is required" };
  }
  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter a valid amount" };
  }

  let recurringDay: number | null = null;
  if (formData.recurring) {
    recurringDay = parseInt(formData.recurringDay ?? "");
    if (isNaN(recurringDay) || recurringDay < 1 || recurringDay > 28) {
      return { error: "Recurring day must be between 1 and 28" };
    }
  }

  const amountBdt = await toBdt(amount, formData.currency);

  const expense = await prisma.expense.create({
    data: {
      title: formData.title,
      description: formData.description || null,
      amount,
      currency: formData.currency,
      amountBdt,
      category: formData.category || "Other",
      source: "CUSTOM",
      recurring: formData.recurring,
      recurringDay,
      createdById: session.user.id,
    },
  });

  await audit(
    session.user.id,
    "EXPENSE_ADDED",
    "Expense",
    expense.id,
    `${formData.category} · ${formData.currency} ${amount}${
      formData.recurring ? ` · recurring day ${recurringDay}` : ""
    }`
  );

  revalidatePath("/accounts");
  revalidatePath("/accounts/earnings");
  return { success: true };
}

// ============================================
// DELETE ENTRY (custom only — auto stays)
// ============================================
export async function deleteFinanceEntry(
  id: string,
  type: "earning" | "expense"
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (type === "earning") {
    const entry = await prisma.earning.findUnique({ where: { id } });
    if (entry?.source === "AUTO") {
      return { error: "Auto entries come from paid invoices — cancel the invoice instead" };
    }
    await prisma.earning.delete({ where: { id } });
  } else {
    await prisma.expense.delete({ where: { id } });
  }

  await audit(session.user.id, "FINANCE_ENTRY_DELETED", type, id);

  revalidatePath("/accounts");
  revalidatePath("/accounts/earnings");
  return { success: true };
}