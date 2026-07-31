"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { notify, notifyAdmins } from "@/lib/notify";
import type { Prisma } from "@prisma/client";
import { verifySensitiveActionCode } from "@/lib/sensitive-verify";
import { invoiceBuyerName } from "@/lib/job-invoice";
import { createReferralCommissionForPayment } from "@/lib/referral-finance";

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

async function checkSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
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

/**
 * Percentage surcharge for a payment method, from Settings.
 *
 * bKash cash-out costs the agency a fee, so an invoice the client intends to
 * pay that way can carry it. Returns null when no charge is configured, which
 * keeps every other method behaving exactly as before.
 */
// Not exported: a "use server" module may only export async functions, and
// exporting this object breaks every action in the file (and every action on
// any page that imports it). Only resolveMethodCharge below needs it.
const METHOD_CHARGE_SETTING_KEYS: Record<string, string> = {
  BKASH: "payment.bkashChargePercent",
  NAGAD: "payment.nagadChargePercent",
};

async function resolveMethodCharge(methodKey?: string | null) {
  const key = methodKey?.trim().toUpperCase();
  if (!key) return null;

  const settingKey = METHOD_CHARGE_SETTING_KEYS[key];
  if (!settingKey) return null;

  const setting = await prisma.setting
    .findUnique({ where: { key: settingKey }, select: { value: true } })
    .catch(() => null);

  const percent = parseFloat(setting?.value ?? "");
  if (!Number.isFinite(percent) || percent <= 0) return null;

  const label = key.charAt(0) + key.slice(1).toLowerCase();
  return { percent, label: `${label} charge` };
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
async function convert(
  amount: number,
  currency: string,
  options?: { useReceivedUsdRate?: boolean }
) {
  const rates = await prisma.exchangeRate.findMany();
  const map = new Map(rates.map((r) => [r.code, Number(r.rateToBdt)]));
  const usdRate = map.get("USD") ?? 120;
  const receivedUsdSetting = options?.useReceivedUsdRate
    ? await prisma.setting.findUnique({
        where: { key: "finance.receivedUsdRate" },
      })
    : null;
  const receivedUsdRate = Number(receivedUsdSetting?.value ?? 0);
  const effectiveUsdRate =
    options?.useReceivedUsdRate &&
    Number.isFinite(receivedUsdRate) &&
    receivedUsdRate > 0
      ? receivedUsdRate
      : usdRate;

  const toBdt =
    currency === "BDT"
      ? amount
      : amount *
        (currency === "USD"
          ? effectiveUsdRate
          : map.get(currency) ?? usdRate);
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

  const { toUsd } = await convert(paidAmount, invoice.currency);
  const { toBdt } = await convert(paidAmount, invoice.currency, {
    useReceivedUsdRate: invoice.currency === "USD",
  });

  // Loyalty: X points per $Y paid (from Settings)
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["loyalty.pointsPer", "loyalty.perAmountUsd"] } },
  });
  const sMap = new Map(settings.map((s) => [s.key, s.value]));
  const pointsPer = parseInt(sMap.get("loyalty.pointsPer") ?? "50");
  const perAmountUsd = parseInt(sMap.get("loyalty.perAmountUsd") ?? "10");
  const points = Math.floor(toUsd / perAmountUsd) * pointsPer;

  // An external marketplace invoice has no Client row, so there is no wallet
  // ledger and no loyalty account to credit — only the earning below applies.
  const clientId = invoice.clientId;
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (clientId) {
    ops.push(
      // Client wallet ledger — payment record
      prisma.clientTxn.create({
        data: {
          clientId,
          amount: paidAmount,
          kind: "INVOICE_PAYMENT",
          note: `${invoice.number} · via ${paidVia}`,
          invoiceId: invoice.id,
          createdById: actorId,
        },
      })
    );

    if (points > 0) {
      ops.push(
        prisma.pointTxn.create({
          data: {
            clientId,
            points,
            kind: "EARN",
            note: `${invoice.number} payment`,
            invoiceId: invoice.id,
          },
        }),
        prisma.client.update({
          where: { id: clientId },
          data: { points: { increment: points } },
        })
      );
    }
  }

  // An advance invoice funds project costs rather than paying for work
  // delivered, so the money sits in the client's balance until it is spent.
  if (invoice.creditsClientBalance && clientId) {
    ops.push(
      prisma.clientTxn.create({
        data: {
          clientId,
          amount: paidAmount,
          kind: "ADVANCE",
          note: `${invoice.number} · advance for project costs`,
          invoiceId: invoice.id,
          createdById: actorId,
        },
      }),
      prisma.client.update({
        where: { id: clientId },
        data: { balance: { increment: paidAmount } },
      })
    );
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  // Advance money is not earnings — it only becomes revenue once it is
  // actually earned — so the Earning row is skipped. The client is still
  // notified below that their payment landed.
  if (!invoice.creditsClientBalance) {
    // Auto earning entry (once per invoice — upsert on unique invoiceId)
    await prisma.earning.upsert({
      where: { invoiceId: invoice.id },
      update: {
        amount: { increment: paidAmount },
        amountBdt: { increment: toBdt },
      },
      create: {
        title: `${invoice.number} — ${invoiceBuyerName(invoice)}`,
        amount: paidAmount,
        currency: invoice.currency,
        amountBdt: toBdt,
        source: "AUTO",
        invoiceId: invoice.id,
        createdById: actorId,
      },
    });
  }

  // Notify the client's portal user (external buyers have no portal account)
  const clientUser = clientId
    ? await prisma.user.findFirst({ where: { clientId } })
    : null;
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

  await createReferralCommissionForPayment({
    invoiceId,
    paidAmount,
    actorId,
    source: "PAYMENT_APPROVAL",
  }).catch((error) => {
    console.error("Failed to create referral commission:", error);
  });
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
  /** Payment method whose Settings surcharge should be added (e.g. BKASH). */
  chargeMethodKey?: string;
  payoneerInvoiceUrl?: string;
  payoneerInvoiceButtonLabel?: string;
  payoneerInvoiceNote?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.clientId) return { error: "Please select a client" };
  if (!formData.title || formData.title.length < 2) {
    return { error: "Invoice title is required" };
  }
  if (!formData.dueDate) return { error: "Due date is required" };

  const payoneerInvoiceUrl =
    formData.payoneerInvoiceUrl?.trim() || null;

  if (payoneerInvoiceUrl) {
    try {
      const url = new URL(payoneerInvoiceUrl);
      const isLocalhost = url.hostname === "localhost";
      if (url.protocol !== "https:" && !isLocalhost) {
        return { error: "Payoneer invoice URL must be HTTPS" };
      }
    } catch {
      return { error: "Enter a valid Payoneer invoice URL" };
    }
  }

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
  const afterVat = vat ? subtotal * (1 + vat / 100) : subtotal;

  // Payment-method surcharge (the bKash cash-out fee, for example). The rate
  // is read from Settings now and stored on the invoice, so changing the
  // setting later never rewrites an invoice that has already gone out.
  const methodCharge = await resolveMethodCharge(formData.chargeMethodKey);
  const total = methodCharge
    ? Math.round(afterVat * (1 + methodCharge.percent / 100) * 100) / 100
    : afterVat;

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
      methodChargePercent: methodCharge?.percent ?? null,
      methodChargeLabel: methodCharge?.label ?? null,
      balanceApplied,
      amountPaid: balanceApplied,
      status: fullyCovered ? "PAID" : "DUE",
      // formData.dueDate is a bare "YYYY-MM-DD" from a date picker; `new Date()`
      // would read it as UTC midnight (Dhaka 06:00), pushing the OVERDUE
      // transition 6 hours past the Dhaka-local due moment the admin picked.
      dueDate: new Date(`${formData.dueDate}T00:00:00+06:00`),
      paidVia: fullyCovered ? "Client balance" : null,
      payoneerInvoiceUrl,
      payoneerInvoiceButtonLabel:
        formData.payoneerInvoiceButtonLabel?.trim() || null,
      payoneerInvoiceNote:
        formData.payoneerInvoiceNote?.trim() || null,
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
  formData: {
    amount: string;
    methodKey: string;
    paymentDate: string;
    note?: string;
    selectedBankAccountId?: string;
    transactionId?: string;
    secondaryReference?: string;
    senderNumber?: string;
    senderEmail?: string;
    senderName?: string;
    senderBankName?: string;
    senderBankAccount?: string;
    cardLast4?: string;
    paymentSource?: string;
    receiverName?: string;
    attachmentIds?: string[];
  }
) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { select: { companyName: true } } },
  });
  if (!invoice) return { error: "Invoice not found" };

  // Client users may only touch their own invoices
  if (
    session.user.clientId &&
    invoice.clientId !== session.user.clientId
  ) {
    return { error: "Invoice not found" };
  }

  // Payment submission is a client-portal flow. An external marketplace
  // invoice has no client to submit on its behalf — it is settled by an admin
  // recording the payment manually.
  if (!invoice.clientId) {
    return {
      error:
        "This is an external invoice. Record the payment from the admin invoice page instead.",
    };
  }

  if (["PAID", "CANCELLED"].includes(invoice.status)) {
    return { error: "This invoice is already settled" };
  }
  if (invoice.status === "ON_HOLD") {
    return { error: "This invoice is on hold. Please contact us before paying." };
  }

  const amount = parseFloat(formData.amount);
  const remaining = Number(invoice.amount) - Number(invoice.amountPaid);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter the amount you paid" };
  }
  if (amount > remaining + 0.01) {
    return { error: `Remaining due is only ${remaining.toFixed(2)}` };
  }

  const methodKey = formData.methodKey.trim();
  const method = await prisma.paymentMethod.findUnique({
    where: { key: methodKey },
    include: { bankAccounts: true },
  });

  if (!method) return { error: "Select a valid payment method" };

  const paymentDate = new Date(formData.paymentDate);
  if (!formData.paymentDate || Number.isNaN(paymentDate.getTime())) {
    return { error: "Payment date is required" };
  }

  const attachmentIds = formData.attachmentIds ?? [];
  let selectedBankAccountId: string | null = null;

  if (methodKey === "BANK_TRANSFER") {
    if (!method.active) return { error: "Bank Transfer is not enabled" };

    const bankAccount = method.bankAccounts.find(
      (account) => account.id === formData.selectedBankAccountId
    );

    if (
      !bankAccount ||
      !bankAccount.active ||
      !bankAccount.bankName.trim() ||
      !bankAccount.accountName.trim() ||
      !bankAccount.accountNumber.trim()
    ) {
      return { error: "Select an active configured bank account" };
    }

    selectedBankAccountId = bankAccount.id;

    if (!formData.transactionId?.trim()) {
      return { error: "Bank transaction/reference number is required" };
    }
  }

  if (methodKey === "BKASH" || methodKey === "NAGAD") {
    if (!method.active || !method.receiverNumber || !method.accountType) {
      return { error: `${method.label} is not configured` };
    }
    if (!formData.senderNumber?.trim()) {
      return { error: `${method.label} sender number is required` };
    }
    if (!formData.transactionId?.trim()) {
      return { error: `${method.label} transaction ID is required` };
    }
    if (attachmentIds.length === 0) {
      return {
        error: `${method.label} payment screenshot or slip is required`,
      };
    }
  }

  if (methodKey === "WISE") {
    const wiseConfigured =
      Boolean(method.wisePaymentUrl?.trim()) ||
      Boolean(method.wiseEmail?.trim()) ||
      Boolean(method.wiseTransferDetails?.trim());

    if (!method.active || !wiseConfigured) {
      return { error: "Wise is not configured" };
    }
    if (!formData.transactionId?.trim()) {
      return { error: "Wise transfer/reference ID is required" };
    }
    if (!formData.senderEmail?.trim() && !formData.senderName?.trim()) {
      return { error: "Wise sender email or account name is required" };
    }
  }

  if (methodKey === "CASH") {
    if (!method.active || !method.instructions?.trim()) {
      return { error: "Cash payment is not configured" };
    }
    if (!formData.receiverName?.trim()) {
      return { error: "Receiver team member name is required" };
    }
  }

  if (methodKey === "PAYONEER") {
    const hasInvoiceLink = Boolean(invoice.payoneerInvoiceUrl?.trim());
    const directConfigured =
      method.active &&
      method.payoneerDirectEnabled &&
      Boolean(method.payoneerMerchantId?.trim()) &&
      Boolean(process.env.PAYONEER_API_USERNAME) &&
      Boolean(process.env.PAYONEER_API_PASSWORD);

    if (!hasInvoiceLink && !directConfigured) {
      return { error: "Payoneer is not configured for this invoice" };
    }
    if (!formData.paymentSource?.trim()) {
      return { error: "Payoneer payment source is required" };
    }
    if (!formData.transactionId?.trim()) {
      return { error: "Payoneer transaction/reference ID is required" };
    }

    if (formData.paymentSource === "Bank Transfer") {
      if (!formData.senderBankName?.trim()) {
        return { error: "Sender bank name is required" };
      }
      if (!formData.senderName?.trim()) {
        return { error: "Sender/account holder name is required" };
      }
      if (!formData.secondaryReference?.trim()) {
        return { error: "Bank transaction/reference ID is required" };
      }
    }

    if (formData.paymentSource === "Card" && !formData.senderName?.trim()) {
      return { error: "Cardholder name is required" };
    }

    if (
      formData.paymentSource === "Payoneer Balance" &&
      !formData.senderEmail?.trim()
    ) {
      return { error: "Payoneer account email is required" };
    }
  }

  if (attachmentIds.length > 0) {
    const attachments = await prisma.attachment.findMany({
      where: { id: { in: attachmentIds } },
      select: {
        id: true,
        uploadedById: true,
        paymentSubmissionId: true,
        messageId: true,
        mimeType: true,
      },
    });

    if (attachments.length !== attachmentIds.length) {
      return { error: "One or more proof files could not be found" };
    }

    const allowedTypes = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ]);

    for (const attachment of attachments) {
      if (
        attachment.uploadedById &&
        attachment.uploadedById !== session.user.id
      ) {
        return { error: "A proof file belongs to another user" };
      }
      if (attachment.paymentSubmissionId || attachment.messageId) {
        return { error: "A proof file is already attached elsewhere" };
      }
      if (attachment.mimeType && !allowedTypes.has(attachment.mimeType)) {
        return { error: "Proof files must be JPG, PNG, or PDF" };
      }
    }
  }

  const summary = `${method.label} payment submitted · claimed ${amount.toFixed(2)}${
    formData.transactionId?.trim()
      ? ` · ref ${formData.transactionId.trim()}`
      : ""
  }`;

  const submission = await prisma.paymentSubmission.create({
    data: {
      invoiceId,
      clientId: invoice.clientId,
      paymentMethodId: method.id,
      methodKey,
      methodLabel: method.label,
      amount,
      currency: invoice.currency,
      paymentDate,
      selectedBankAccountId,
      transactionId: formData.transactionId?.trim() || null,
      secondaryReference:
        formData.secondaryReference?.trim() || null,
      senderNumber: formData.senderNumber?.trim() || null,
      senderEmail: formData.senderEmail?.trim() || null,
      senderName: formData.senderName?.trim() || null,
      senderBankName: formData.senderBankName?.trim() || null,
      senderBankAccount:
        formData.senderBankAccount?.trim() || null,
      cardLast4: formData.cardLast4?.trim() || null,
      paymentSource: formData.paymentSource?.trim() || null,
      receiverName: formData.receiverName?.trim() || null,
      note: formData.note?.trim() || null,
      submittedById: session.user.id,
    },
  });

  if (attachmentIds.length > 0) {
    await prisma.attachment.updateMany({
      where: {
        id: { in: attachmentIds },
        uploadedById: session.user.id,
        paymentSubmissionId: null,
      },
      data: { paymentSubmissionId: submission.id },
    });
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
  revalidatePath(`/c/invoices/${invoiceId}`);
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
  formData: {
    amount: string;
    method: string;
    reference: string;
    /**
     * What to do with the shortfall when the client pays less than the full
     * invoice. "DUE" leaves it owing; "CLEAR" absorbs it so what they actually
     * paid settles the invoice.
     */
    settleRemainder?: "DUE" | "CLEAR";
    /** Draw the shortfall from the client's balance before deciding. */
    useClientBalance?: boolean;
    writeOffNote?: string;
  }
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

  // Settlement order: cash received first, then the client's own balance if
  // asked for, and only what is still missing after that can be written off.
  let balanceUsed = 0;
  let shortfall = Math.round((remaining - amount) * 100) / 100;

  if (formData.useClientBalance && shortfall > 0 && invoice.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: invoice.clientId },
      select: { balance: true },
    });
    const available = Math.max(0, Number(client?.balance ?? 0));
    balanceUsed = Math.min(available, shortfall);
    shortfall = Math.round((shortfall - balanceUsed) * 100) / 100;
  }

  const writeOff =
    formData.settleRemainder === "CLEAR" && shortfall > 0 ? shortfall : 0;

  const newPaid = Number(invoice.amountPaid) + amount + balanceUsed;
  const fullyPaid =
    newPaid + writeOff >= Number(invoice.amount) - 0.01;
  const via = `${formData.method}${
    formData.reference ? ` (${formData.reference})` : ""
  } — recorded manually`;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: newPaid,
      balanceApplied: { increment: balanceUsed },
      status: fullyPaid ? "PAID" : "PARTIALLY_PAID",
      paidVia: via,
      approvedById: session.user.id,
      ...(writeOff > 0
        ? {
            writtenOffAmount: { increment: writeOff },
            writtenOffNote:
              formData.writeOffNote?.trim() ||
              "Cleared by adjustment — settled at the amount received",
            writtenOffAt: new Date(),
            writtenOffById: session.user.id,
          }
        : {}),
    },
  });

  // Spending the client's balance is a ledger movement in its own right, so
  // it gets its own entry rather than hiding inside the payment.
  if (balanceUsed > 0 && invoice.clientId) {
    await prisma.$transaction([
      prisma.clientTxn.create({
        data: {
          clientId: invoice.clientId,
          amount: -balanceUsed,
          kind: "INVOICE_DEDUCT",
          note: `${invoice.number} · applied from balance`,
          invoiceId: invoice.id,
          createdById: session.user.id,
        },
      }),
      prisma.client.update({
        where: { id: invoice.clientId },
        data: { balance: { decrement: balanceUsed } },
      }),
    ]);
  }

  await applyPaidEffects(invoiceId, amount + balanceUsed, session.user.id, via);

  if (writeOff > 0) {
    await audit(
      session.user.id,
      "INVOICE_SHORTFALL_CLEARED",
      "Invoice",
      invoiceId,
      `${writeOff.toFixed(2)} ${invoice.currency}`
    );
  }

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

// ============================================
// HOLD / RESUME INVOICE
// Holding blocks the client from submitting a new payment
// while the invoice stays visible. Does not affect anything
// already paid.
// ============================================
export async function holdInvoice(invoiceId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });
  if (!invoice) return { error: "Invoice not found" };
  if (["PAID", "CANCELLED"].includes(invoice.status)) {
    return { error: "This invoice is already settled" };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "ON_HOLD" },
  });

  await audit(session.user.id, "INVOICE_HELD", "Invoice", invoiceId);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/c/invoices/${invoiceId}`);
  return { success: true };
}

export async function unholdInvoice(invoiceId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, dueDate: true },
  });
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status !== "ON_HOLD") {
    return { error: "This invoice is not on hold" };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: invoice.dueDate < new Date() ? "OVERDUE" : "DUE",
    },
  });

  await audit(session.user.id, "INVOICE_RESUMED", "Invoice", invoiceId);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/c/invoices/${invoiceId}`);
  return { success: true };
}

// ============================================
// DELETE INVOICE
// Super admin only, step-up verified. Removes the
// invoice and its items/payment submissions
// (cascade). Client/point ledger entries that
// reference this invoice keep their historical
// note but the invoiceId link becomes orphaned,
// same as other loose audit-style references in
// this app.
// ============================================
export async function deleteInvoice(invoiceId: string, verificationCode: string) {
  const session = await checkSuperAdmin();
  if (!session) return { error: "Only the super admin can delete an invoice" };

  const verified = await verifySensitiveActionCode(
    session.user.id,
    verificationCode
  );
  if (!verified) return { error: "Verification code is invalid or expired" };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { clientId: true },
  });
  if (!invoice) return { error: "Invoice not found" };

  await prisma.invoice.delete({ where: { id: invoiceId } });

  await audit(session.user.id, "INVOICE_DELETED", "Invoice", invoiceId);

  revalidatePath("/invoices");
  revalidatePath(`/clients/${invoice.clientId}`);
  return { success: true };
}

// ============================================
// UPDATE INVOICE (only while nothing has been paid yet)
// ============================================
export async function updateInvoice(
  invoiceId: string,
  formData: {
    title: string;
    items: { description: string; qty: string; amount: string }[];
    currency: "USD" | "EUR" | "GBP" | "BDT";
    vatPercent?: string;
    dueDate: string;
    payoneerInvoiceUrl?: string;
    payoneerInvoiceButtonLabel?: string;
    payoneerInvoiceNote?: string;
    verificationCode: string;
  }
) {
  // Editing an invoice changes what a client owes, so it is held to the same
  // bar as deleting one: super admin plus a step-up code.
  const session = await checkSuperAdmin();
  if (!session) return { error: "Only the super admin can edit an invoice" };

  const verified = await verifySensitiveActionCode(
    session.user.id,
    formData.verificationCode
  );
  if (!verified) return { error: "Verification code is invalid or expired" };

  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, amountPaid: true, balanceApplied: true },
  });
  if (!existing) return { error: "Invoice not found" };
  if (["PAID", "CANCELLED"].includes(existing.status)) {
    return { error: "This invoice is already settled and can't be edited" };
  }
  if (Number(existing.amountPaid) > 0) {
    return {
      error:
        "This invoice already has a payment recorded against it and can't be edited. Cancel it and create a new one instead.",
    };
  }

  if (!formData.title || formData.title.length < 2) {
    return { error: "Invoice title is required" };
  }
  if (!formData.dueDate) return { error: "Due date is required" };

  const payoneerInvoiceUrl = formData.payoneerInvoiceUrl?.trim() || null;

  if (payoneerInvoiceUrl) {
    try {
      const url = new URL(payoneerInvoiceUrl);
      const isLocalhost = url.hostname === "localhost";
      if (url.protocol !== "https:" && !isLocalhost) {
        return { error: "Payoneer invoice URL must be HTTPS" };
      }
    } catch {
      return { error: "Enter a valid Payoneer invoice URL" };
    }
  }

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

  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        title: formData.title,
        amount: total,
        currency: formData.currency,
        vatPercent: vat,
        // See createCustomInvoice: anchor to Dhaka midnight, not UTC midnight.
        dueDate: new Date(`${formData.dueDate}T00:00:00+06:00`),
        payoneerInvoiceUrl,
        payoneerInvoiceButtonLabel:
          formData.payoneerInvoiceButtonLabel?.trim() || null,
        payoneerInvoiceNote: formData.payoneerInvoiceNote?.trim() || null,
        items: { create: items },
      },
    }),
  ]);

  await audit(
    session.user.id,
    "INVOICE_UPDATED",
    "Invoice",
    invoiceId,
    `${formData.currency} ${total.toFixed(2)}`
  );

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/c/invoices/${invoiceId}`);
  return { success: true };
}

// ============================================
// PROJECT PURCHASES
//
// Line items on an advance invoice represent things bought for a project
// (tools, licences, stock). Ticking one as bought spends that money out of
// the client's balance, so it is a real money movement and is gated the same
// way as adjusting a balance: super admin plus a step-up code.
// ============================================
export async function setInvoiceItemPurchased(input: {
  itemId: string;
  purchased: boolean;
  note?: string;
  verificationCode: string;
}) {
  const session = await checkSuperAdmin();
  if (!session) {
    return { error: "Only the super admin can record a purchase" };
  }

  const verified = await verifySensitiveActionCode(
    session.user.id,
    input.verificationCode
  );
  if (!verified) return { error: "Verification code is invalid or expired" };

  const item = await prisma.invoiceItem.findUnique({
    where: { id: input.itemId },
    include: {
      invoice: {
        select: { id: true, number: true, clientId: true, currency: true },
      },
    },
  });
  if (!item) return { error: "Item not found" };
  if (item.purchased === input.purchased) {
    return { error: "This item is already in that state" };
  }

  const clientId = item.invoice.clientId;
  if (!clientId) {
    return {
      error: "This invoice has no client, so there is no balance to draw from.",
    };
  }

  const cost = Number(item.amount) * item.qty;
  const direction = input.purchased ? -1 : 1;

  try {
    await prisma.$transaction([
      prisma.invoiceItem.update({
        where: { id: item.id },
        data: {
          purchased: input.purchased,
          purchasedAt: input.purchased ? new Date() : null,
          purchasedById: input.purchased ? session.user.id : null,
          purchaseNote: input.purchased ? (input.note?.trim() || null) : null,
        },
      }),
      prisma.clientTxn.create({
        data: {
          clientId,
          amount: cost * direction,
          kind: "INVOICE_DEDUCT",
          note: input.purchased
            ? `Purchased: ${item.description} (${item.invoice.number})`
            : `Purchase reversed: ${item.description} (${item.invoice.number})`,
          invoiceId: item.invoice.id,
          createdById: session.user.id,
        },
      }),
      prisma.client.update({
        where: { id: clientId },
        data: { balance: { increment: cost * direction } },
      }),
    ]);

    await audit(
      session.user.id,
      input.purchased ? "PURCHASE_RECORDED" : "PURCHASE_REVERSED",
      "InvoiceItem",
      item.id,
      `${item.description} · ${cost}`
    );

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${item.invoice.id}`);
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/jobs");

    return { success: true };
  } catch (error) {
    console.error("Failed to record purchase:", error);
    return { error: "Could not record this purchase" };
  }
}

/**
 * Raises an advance invoice straight from a job's page — the client is
 * whoever the job already belongs to, so nothing needs picking. The amount
 * is the one field that can't be defaulted (there's no sensible guess for
 * how much to bill); title and due date fall back to something reasonable
 * so the admin isn't forced to type either.
 */
export async function createJobAdvanceInvoice(input: {
  jobId: string;
  amount: string;
  title?: string;
  dueDate?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const amount = parseFloat(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than zero" };
  }

  const job = await prisma.job.findUnique({
    where: { id: input.jobId },
    select: { title: true, clientId: true, client: { select: { currency: true } } },
  });
  if (!job) return { error: "Job not found" };
  if (!job.clientId) {
    return { error: "This job has no linked client, so there is no balance to fund" };
  }

  const number = await nextInvoiceNumber();
  const title = input.title?.trim() || `Project purchases — ${job.title}`;
  // A bare "YYYY-MM-DD" reads as UTC midnight, not Dhaka midnight — see
  // createCustomInvoice above for why the offset is anchored explicitly.
  const dueDate = input.dueDate?.trim()
    ? new Date(`${input.dueDate.trim()}T00:00:00+06:00`)
    : new Date();

  const invoice = await prisma.invoice.create({
    data: {
      number,
      type: "CUSTOM",
      title,
      jobId: input.jobId,
      clientId: job.clientId,
      amount,
      currency: job.client?.currency ?? "USD",
      creditsClientBalance: true,
      status: "DUE",
      dueDate,
    },
  });

  await audit(
    session.user.id,
    "INVOICE_CREATED",
    "Invoice",
    invoice.id,
    `${number} · advance · ${amount.toFixed(2)}`
  );

  const clientUser = await prisma.user.findFirst({
    where: { clientId: job.clientId },
  });
  if (clientUser) {
    await notify({
      userId: clientUser.id,
      title: `New invoice — ${number}`,
      body: `${title} · ${job.client?.currency ?? "USD"} ${amount.toFixed(2)}`,
      href: `/c/invoices/${invoice.id}`,
    });
  }

  revalidatePath("/invoices");
  revalidatePath(`/jobs/${input.jobId}`);
  return { success: true, invoiceId: invoice.id };
}

/**
 * Appends a line item to an existing advance invoice — the shopping list for
 * a project grows over the life of the job, well after the advance itself
 * was paid, so this deliberately skips updateInvoice's paid-invoice lock and
 * doesn't touch the invoice's own amount. The item is just something to buy
 * against the balance the advance already funded; setInvoiceItemPurchased is
 * what actually moves money when it's ticked off.
 */
export async function addJobPurchaseItem(input: {
  invoiceId: string;
  description: string;
  qty?: string;
  amount: string;
  costUsd?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const description = input.description?.trim();
  if (!description) return { error: "Item description is required" };

  const amount = parseFloat(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than zero" };
  }

  const qty = Math.max(1, parseInt(input.qty ?? "1") || 1);
  const costUsd =
    input.costUsd?.trim() && Number.isFinite(parseFloat(input.costUsd))
      ? parseFloat(input.costUsd)
      : null;

  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    select: { id: true, jobId: true, creditsClientBalance: true },
  });
  if (!invoice) return { error: "Invoice not found" };
  if (!invoice.creditsClientBalance) {
    return { error: "Only advance invoices can carry purchase items" };
  }

  const item = await prisma.invoiceItem.create({
    data: { invoiceId: invoice.id, description, qty, amount, costUsd },
  });

  await audit(
    session.user.id,
    "INVOICE_ITEM_ADDED",
    "InvoiceItem",
    item.id,
    `${description} · ${amount.toFixed(2)}`
  );

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  if (invoice.jobId) revalidatePath(`/jobs/${invoice.jobId}`);

  return { success: true };
}
