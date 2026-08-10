import { prisma } from "@/lib/prisma";

export const CLIENT_WALLET_KINDS = [
  "ADVANCE",
  "ADJUSTMENT",
  "POINT_EXCHANGE",
  "INVOICE_DEDUCT",
  "REFUND",
] as const;

/**
 * Wallet credit is the sum of actual wallet movements. Invoice payments are
 * service revenue and must never be counted as client-held credit.
 */
export async function getClientWalletBalance(clientId: string) {
  const result = await prisma.clientTxn.aggregate({
    where: { clientId, kind: { in: [...CLIENT_WALLET_KINDS] } },
    _sum: { amount: true },
  });

  return Number(result._sum.amount ?? 0);
}
