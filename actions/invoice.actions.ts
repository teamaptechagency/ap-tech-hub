"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { notify, notifyAdmins } from "@/lib/notify";

// ============================================
// HELPERS
// ============================================
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

// INV-2026-0001 style numbering
async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { number: { startsWith: `INV-${year}-` } },
  });
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

// Convert any supported currency amount → BDT + USD
async function convert(amount: number, currency: string) {
  const rates = await prisma.exchangeRate.findMany();
  const map = new Map(rates.map((r) => [r.code, Number(r.rateToBdt)]));
  const usdRate = map.get("USD") ?? 120;

  const toBdt =
    currency === "BDT" ? amount : amount * (map.get(currency) ?? usdRate);
  const toUsd = currency === "USD" ? amount : toBdt / usdRate;

  return { toBdt, toUsd };
}

// ============================================
// SHARED "MARK PAID" EFFECTS
// Called by approvePayment AND recordManualPayment:
// - loyalty points (Settings-driven)
// - auto earning entry (BDT converted)
// - client ledger entry
// - notify client
// ============================================
async function applyPaidEffects(
  invoiceId: string,
  paidAmount: number,
  actorId: string,
  paidVia: string
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { select: { id: true, companyName: true } } },
  });
  if (!invoice) return;

  const { toBdt, toUsd } = await convert(paidAmount, invoice.currency);

  // Loyalty: X points per $Y paid (from Settings)
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["loyalty.pointsPer", "loyalty.perAmountUsd"] } },
  });
  const sMap = new Map(settings.map((s) => [s.key, s.value]));
  const pointsPer = parseInt(sMap.get("loyalty.pointsPer") ?? "50");
  const perAmountUsd = parseInt(sMap.get("loyalty.perAmountUsd") ?? "10");
  const points = Math.floor(toUsd / perAmountUsd) * pointsPer;

  const ops: any[] = [
    // Client wallet ledger — payment record
    prisma.clientTxn.create({
      data: {
        clientId: invoice.clientId,
        amount: paidAmount,
        kind: "INVOICE_PAYMENT",
        note: `${invoice.number} · via ${paidVia}`,
        invoiceId: invoice.id,
        createdById: actorId,
      },
    }),
  ];

  if (points > 0) {
    ops.push(
      prisma.pointTxn.create({
        data: {
          clientId: invoice.clientId,
          points,
          kind: "EARN",
          note: `${invoice.number} payment`,
          invoiceId: invoice.id,
        },
      }),
      prisma.client.update({
        where: { id: invoice.clientId },
        data: { points: { increment: points } },
      })
    );
  }

  await prisma.$transaction(ops);

  // Auto earning entry (once per invoice — upsert on unique invoiceId)
  await prisma.earning.upsert({
    where: { invoiceId: invoice.id },
    update: {
      amount: { increment: paidAmount },
      amountBdt: { increment: toBdt },
    },
    create: {
      title: `${invoice.number} — ${invoice.client.companyName}`,
      amount: paidAmount,
      currency: invoice.currency,
      amountBdt: toBdt,
      source: "AUTO",
      invoiceId: invoice.id,
      createdById: actorId,
    },
  });

  // Notify the client's portal user
  const clientUser = await prisma.user.findFirst({
    where: { clientId: invoice.clientId },
  });
  if (clientUser) {
    await notify({
      userId: clientUser.id,
      title: `Payment received — ${invoice.number}`,
      body:
        points > 0
          ? `Thank you! ${points.toLocaleString()} loyalty points have been credited.`
          : "Thank you! Your payment has been recorded.",
      href: `/c/invoices/${invoice.id}`,
    });
  }
}

// ============================================
// CREATE CUSTOM INVOICE
// - line items, optional VAT %
// - optional balance deduction from client wallet
// ============================================
export async function createCustomInvoice(formData: {
  clientId: string;
  jobId?: string;
  title: string;
  items: { description: string; qty: string; amount: string }[];
  currency: "USD" | "EUR" | "GBP" | "BDT";
  vatPercent?: string;
  dueDate: string;
  deductFromBalance: boolean;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.clientId) return { error: "Please select a client" };
  if (!formData.title || formData.title.length < 2) {
    return { error: "Invoice title is required" };
  }
  if (!formData.dueDate) return { error: "Due date is required" };

  const items = formData.items
    .map((i) => ({
      description: i.description.trim(),
      qty: parseInt(i.qty) || 1,
      amount: parseFloat(i.amount) || 0,
    }))
    .filter((i) => i.description && i.amount > 0);

  if (items.length === 0) {
    return { error: "Add at least one line item with an amount" };
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.amount, 0);
  const vat = formData.vatPercent ? parseFloat(formData.vatPercent) : null;
  const total = vat ? subtotal * (1 + vat / 100) : subtotal;

  // Balance deduction (only positive client balance applies)
  let balanceApplied = 0;
  if (formData.deductFromBalance) {
    const client = await prisma.client.findUnique({
      where: { id: formData.clientId },
    });
    const available = Number(client?.balance ?? 0);
    if (available > 0) {
      balanceApplied = Math.min(available, total);
    }
  }

  const number = await nextInvoiceNumber();
  const fullyCovered = balanceApplied >= total;

  const invoice = await prisma.invoice.create({
    data: {
      number,
      type: "CUSTOM",
      title: formData.title,
      jobId: formData.jobId || null,
      clientId: formData.clientId,
      amount: total,
      currency: formData.currency,
      vatPercent: vat,
      balanceApplied,
      amountPaid: balanceApplied,
      status: fullyCovered ? "PAID" : "DUE",
      dueDate: new Date(formData.dueDate),
      paidVia: fullyCovered ? "Client balance" : null,
      items: { create: items },
    },
  });

  // Deduct from wallet + ledger entry
  if (balanceApplied > 0) {
    await prisma.$transaction([
      prisma.clientTxn.create({
        data: {
          clientId: formData.clientId,
          amount: -balanceApplied,
          kind: "INVOICE_DEDUCT",
          note: `Applied to ${number}`,
          invoiceId: invoice.id,
          createdById: session.user.id,
        },
      }),
      prisma.client.update({
        where: { id: formData.clientId },
        data: { balance: { decrement: balanceApplied } },
      }),
    ]);
  }

  await audit(
    session.user.id,
    "INVOICE_CREATED",
    "Invoice",
    invoice.id,
    `${number} · ${formData.currency} ${total.toFixed(2)}`
  );

  // Notify the client about the new invoice
  const clientUser = await prisma.user.findFirst({
    where: { clientId: formData.clientId },
  });
  if (clientUser && !fullyCovered) {
    await notify({
      userId: clientUser.id,
      title: `New invoice — ${number}`,
      body: `${formData.title} · ${formData.currency} ${total.toFixed(2)}`,
      href: `/c/invoices/${invoice.id}`,
    });
  }

  revalidatePath("/invoices");
  return { success: true, invoiceId: invoice.id };
}

// ============================================
// CLIENT SUBMITS PAYMENT (partial allowed)
// ============================================
export async function submitPayment(
  invoiceId: string,
  formData: { amount: string; note: string }
) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) return { error: "Invoice not found" };

  // Client users may only touch their own invoices
  if (
    session.user.clientId &&
    invoice.clientId !== session.user.clientId
  ) {
    return { error: "Invoice not found" };
  }

  if (["PAID", "CANCELLED"].includes(invoice.status)) {
    return { error: "This invoice is already settled" };
  }

  const amount = parseFloat(formData.amount);
  const remaining = Number(invoice.amount) - Number(invoice.amountPaid);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter the amount you paid" };
  }
  if (amount > remaining + 0.01) {
    return { error: `Remaining due is only ${remaining.toFixed(2)}` };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAYMENT_SUBMITTED",
      paymentNote: `${formData.note || "Payment"} · claimed ${amount.toFixed(2)}`,
      submittedAt: new Date(),
    },
  });

  await notifyAdmins({
    title: `Payment submitted — ${invoice.number}`,
    body: `${formData.note || "A client marked an invoice as paid"} · claimed ${amount.toFixed(2)}`,
    href: `/invoices/${invoiceId}`,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { success: true };
}

// ============================================
// ADMIN APPROVES SUBMITTED PAYMENT
// (enters verified amount — partial supported)
// ============================================
export async function approvePayment(
  invoiceId: string,
  formData: { amount: string; paidVia: string }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) return { error: "Invoice not found" };

  const amount = parseFloat(formData.amount);
  const remaining = Number(invoice.amount) - Number(invoice.amountPaid);
  if (isNaN(amount) || amount <= 0 || amount > remaining + 0.01) {
    return { error: `Enter a valid amount (max ${remaining.toFixed(2)})` };
  }

  const newPaid = Number(invoice.amountPaid) + amount;
  const fullyPaid = newPaid >= Number(invoice.amount) - 0.01;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: newPaid,
      status: fullyPaid ? "PAID" : "PARTIALLY_PAID",
      paidVia: formData.paidVia || "Client payment",
      approvedById: session.user.id,
    },
  });

  await applyPaidEffects(
    invoiceId,
    amount,
    session.user.id,
    formData.paidVia || "Client payment"
  );

  await audit(
    session.user.id,
    "PAYMENT_APPROVED",
    "Invoice",
    invoiceId,
    `${amount.toFixed(2)} · ${fullyPaid ? "PAID" : "PARTIAL"}`
  );

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/clients");
  return { success: true };
}

// ============================================
// ADMIN REJECTS SUBMITTED PAYMENT
// ============================================
export async function rejectPayment(invoiceId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice || invoice.status !== "PAYMENT_SUBMITTED") {
    return { error: "No submitted payment to reject" };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status:
        Number(invoice.amountPaid) > 0 ? "PARTIALLY_PAID" : "DUE",
      paymentNote: null,
      submittedAt: null,
    },
  });

  // Let the client know their claim wasn't verified
  const clientUser = await prisma.user.findFirst({
    where: { clientId: invoice.clientId },
  });
  if (clientUser) {
    await notify({
      userId: clientUser.id,
      title: `Payment not verified — ${invoice.number}`,
      body: "We couldn't verify this payment. Please check the reference and try again, or message the team.",
      href: `/c/invoices/${invoiceId}`,
    });
  }

  await audit(session.user.id, "PAYMENT_REJECTED", "Invoice", invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  return { success: true };
}

// ============================================
// ADMIN RECORDS MANUAL PAYMENT (bank/bKash/cash)
// Same effects as approve — your requirement:
// admin can clear invoices paid personally
// ============================================
export async function recordManualPayment(
  invoiceId: string,
  formData: { amount: string; method: string; reference: string }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) return { error: "Invoice not found" };
  if (["PAID", "CANCELLED"].includes(invoice.status)) {
    return { error: "This invoice is already settled" };
  }

  const amount = parseFloat(formData.amount);
  const remaining = Number(invoice.amount) - Number(invoice.amountPaid);
  if (isNaN(amount) || amount <= 0 || amount > remaining + 0.01) {
    return { error: `Enter a valid amount (max ${remaining.toFixed(2)})` };
  }
  if (!formData.method) return { error: "Select the payment method" };

  const newPaid = Number(invoice.amountPaid) + amount;
  const fullyPaid = newPaid >= Number(invoice.amount) - 0.01;
  const via = `${formData.method}${
    formData.reference ? ` (${formData.reference})` : ""
  } — recorded manually`;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: newPaid,
      status: fullyPaid ? "PAID" : "PARTIALLY_PAID",
      paidVia: via,
      approvedById: session.user.id,
    },
  });

  await applyPaidEffects(invoiceId, amount, session.user.id, via);

  await audit(
    session.user.id,
    "PAYMENT_RECORDED_MANUALLY",
    "Invoice",
    invoiceId,
    `${formData.method} · ${amount.toFixed(2)}`
  );

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/clients");
  return { success: true };
}

// ============================================
// CANCEL INVOICE
// ============================================
export async function cancelInvoice(invoiceId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED" },
  });

  await audit(session.user.id, "INVOICE_CANCELLED", "Invoice", invoiceId);

  revalidatePath("/invoices");
  return { success: true };
}