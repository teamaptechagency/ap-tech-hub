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
async function toBdt(amount: number, currency: string, manualRate?: string) {
  if (currency === "BDT") return amount;
  const parsedManualRate = parseFloat(manualRate ?? "");
  if (Number.isFinite(parsedManualRate) && parsedManualRate > 0) {
    return amount * parsedManualRate;
  }
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
  category?: string;
  amount: string;
  currency: "USD" | "EUR" | "GBP" | "BDT";
  exchangeRate?: string;
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

  const amountBdt = await toBdt(
    amount,
    formData.currency,
    formData.exchangeRate
  );

  const earning = await prisma.earning.create({
    data: {
      title: formData.title,
      description: formData.description || null,
      amount,
      currency: formData.currency,
      amountBdt,
      source: "CUSTOM",
      category: formData.category || "Other",
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
  exchangeRate?: string;
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

  const amountBdt = await toBdt(
    amount,
    formData.currency,
    formData.exchangeRate
  );

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
// UPDATE CUSTOM EARNING (custom only — auto is managed by its source)
// ============================================
export async function updateCustomEarning(
  id: string,
  formData: {
    title: string;
    description?: string;
    category?: string;
    amount: string;
    currency: "USD" | "EUR" | "GBP" | "BDT";
    exchangeRate?: string;
  }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const existing = await prisma.earning.findUnique({ where: { id } });
  if (!existing) return { error: "Earning not found" };
  if (existing.source === "AUTO") {
    return { error: "Auto entries come from paid invoices — cancel the invoice instead" };
  }

  if (!formData.title || formData.title.length < 2) {
    return { error: "Title is required" };
  }
  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter a valid amount" };
  }

  const amountBdt = await toBdt(amount, formData.currency, formData.exchangeRate);

  await prisma.earning.update({
    where: { id },
    data: {
      title: formData.title,
      description: formData.description || null,
      amount,
      currency: formData.currency,
      amountBdt,
      category: formData.category || "Other",
    },
  });

  await audit(
    session.user.id,
    "EARNING_UPDATED",
    "Earning",
    id,
    `${formData.currency} ${amount} = ৳${amountBdt.toFixed(0)}`
  );

  revalidatePath("/accounts");
  revalidatePath("/accounts/earnings");
  return { success: true };
}

// ============================================
// UPDATE EXPENSE
// ============================================
export async function updateExpense(
  id: string,
  formData: {
    title: string;
    description?: string;
    amount: string;
    currency: "USD" | "EUR" | "GBP" | "BDT";
    exchangeRate?: string;
    category: string;
    recurring: boolean;
    recurringDay?: string;
  }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return { error: "Expense not found" };

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

  const amountBdt = await toBdt(amount, formData.currency, formData.exchangeRate);

  await prisma.expense.update({
    where: { id },
    data: {
      title: formData.title,
      description: formData.description || null,
      amount,
      currency: formData.currency,
      amountBdt,
      category: formData.category || "Other",
      recurring: formData.recurring,
      recurringDay,
    },
  });

  await audit(
    session.user.id,
    "EXPENSE_UPDATED",
    "Expense",
    id,
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
