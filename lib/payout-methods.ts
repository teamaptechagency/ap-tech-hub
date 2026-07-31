import type { Prisma } from "@prisma/client";

export type PayoutMethodOption = {
  key: string;
  label: string;
  details: string;
  placeholder: string;
};

export type PaymentMethodWithAccounts = Prisma.PaymentMethodGetPayload<{
  include: { bankAccounts: true };
}>;

export function toPayoutMethodOption(
  method: PaymentMethodWithAccounts
): PayoutMethodOption | null {
  const details: string[] = [];

  if (method.key === "BANK_TRANSFER") {
    const accounts = method.bankAccounts.filter(
      (account) =>
        account.active &&
        account.bankName.trim() &&
        account.accountName.trim() &&
        account.accountNumber.trim()
    );
    if (accounts.length === 0) return null;
    details.push(
      ...accounts.map(
        (account) =>
          `${account.bankName}: ${account.accountName}, ${account.accountNumber}`
      )
    );
  } else if (method.key === "BKASH" || method.key === "NAGAD") {
    if (!method.receiverNumber?.trim() || !method.accountType?.trim()) {
      return null;
    }
    details.push(`${method.receiverNumber} (${method.accountType})`);
  } else if (method.key === "WISE") {
    if (
      !method.wiseEmail?.trim() &&
      !method.wisePaymentUrl?.trim() &&
      !method.wiseTransferDetails?.trim()
    ) {
      return null;
    }
    if (method.wiseEmail) details.push(`Wise email: ${method.wiseEmail}`);
    if (method.wiseTransferDetails) details.push(method.wiseTransferDetails);
  } else if (method.key === "CASH") {
    if (!method.cashReceiverInfo?.trim() && !method.instructions?.trim()) {
      return null;
    }
    details.push(method.cashReceiverInfo || method.instructions || "");
  } else if (method.key === "PAYONEER") {
    if (
      !method.payoneerMerchantId?.trim() &&
      !method.payoneerMode?.trim() &&
      !method.details?.trim()
    ) {
      return null;
    }
    details.push(
      method.payoneerButtonLabel ||
        method.payoneerMode ||
        method.details ||
        "Payoneer configured"
    );
  } else if (method.details?.trim()) {
    details.push(method.details);
  } else {
    return null;
  }

  return {
    key: method.key ?? method.label,
    label: method.label,
    details: details.filter(Boolean).join("\n"),
    placeholder: payoutPlaceholder(method.key ?? method.label),
  };
}

function payoutPlaceholder(key: string) {
  if (key === "BANK_TRANSFER") {
    return "Your bank name, account name, account number, branch";
  }
  if (key === "BKASH" || key === "NAGAD") {
    return "Your mobile banking number and account type";
  }
  if (key === "WISE" || key === "PAYONEER") {
    return "Your account email or payment link";
  }
  return "Your payment receiving details";
}
