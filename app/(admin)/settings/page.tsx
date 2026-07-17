import { prisma } from "@/lib/prisma";
import { SettingsShell } from "@/components/settings/settings-shell";

const fixedPaymentMethods = [
  { key: "BANK_TRANSFER", label: "Bank Transfer", sortOrder: 10 },
  { key: "BKASH", label: "bKash", sortOrder: 20 },
  { key: "NAGAD", label: "Nagad", sortOrder: 30 },
  { key: "WISE", label: "Wise", sortOrder: 40 },
  { key: "CASH", label: "Cash", sortOrder: 50 },
  { key: "PAYONEER", label: "Payoneer", sortOrder: 60 },
] as const;

export default async function SettingsPage() {
  const [rates, settings, skills, team, paymentMethods, templates] =
    await Promise.all([
      prisma.exchangeRate.findMany({ orderBy: { code: "asc" } }),
      prisma.setting.findMany(),
      prisma.skill.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { users: true } } },
      }),
      prisma.user.findMany({
        where: {
          role: {
            in: [
              "SUPER_ADMIN",
              "ADMIN",
              "CEO",
              "TEAM_MEMBER",
              "BUSINESS_PARTNER",
              "PARTNER_MANAGER",
            ],
          },
        },
        orderBy: { name: "asc" },
        include: {
          skills: { select: { id: true, name: true } },
          permissions: { orderBy: { resource: "asc" } },
        },
      }),
      prisma.paymentMethod.findMany({
        where: { key: { not: null } },
        orderBy: { sortOrder: "asc" },
        include: { bankAccounts: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.commonTask.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <SettingsShell
      rates={rates.map((r) => ({
        code: r.code,
        rate: Number(r.rateToBdt),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      settings={settingsMap}
      skills={skills.map((s) => ({
        id: s.id,
        name: s.name,
        userCount: s._count.users,
      }))}
      team={team.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        payoutSet: !!u.payoutMethod,
        skillIds: u.skills.map((s) => s.id),
        skillNames: u.skills.map((s) => s.name),
        permissions: u.permissions.map((permission) => ({
          resource: permission.resource,
          canCreate: permission.canCreate,
          canRead: permission.canRead,
          canUpdate: permission.canUpdate,
          canDelete: permission.canDelete,
        })),
      }))}
      paymentMethods={fixedPaymentMethods.map((method) => {
        const saved = paymentMethods.find(
          (paymentMethod) => paymentMethod.key === method.key
        );

        return {
          id: saved?.id ?? method.key,
          key: method.key,
          label: saved?.label ?? method.label,
          active: saved?.active ?? false,
          details: saved?.details ?? "",
          instructions: saved?.instructions ?? undefined,
          warning: saved?.warning ?? undefined,
          receiverNumber: saved?.receiverNumber ?? undefined,
          accountType: saved?.accountType ?? undefined,
          wiseEmail: saved?.wiseEmail ?? undefined,
          wiseAccountName: saved?.wiseAccountName ?? undefined,
          wisePaymentUrl: saved?.wisePaymentUrl ?? undefined,
          wiseTransferDetails:
            saved?.wiseTransferDetails ?? undefined,
          cashReceiverInfo: saved?.cashReceiverInfo ?? undefined,
          payoneerDirectEnabled:
            saved?.payoneerDirectEnabled ?? false,
          payoneerMode: saved?.payoneerMode ?? undefined,
          payoneerMerchantId:
            saved?.payoneerMerchantId ?? undefined,
          payoneerButtonLabel:
            saved?.payoneerButtonLabel ?? undefined,
          sortOrder: saved?.sortOrder ?? method.sortOrder,
          bankAccounts:
            saved?.bankAccounts.map((account) => ({
              id: account.id,
              bankName: account.bankName,
              accountName: account.accountName,
              accountNumber: account.accountNumber,
              branchName: account.branchName ?? undefined,
              routingNumber: account.routingNumber ?? undefined,
              swiftCode: account.swiftCode ?? undefined,
              currency: account.currency,
              instructions: account.instructions ?? undefined,
              active: account.active,
              sortOrder: account.sortOrder,
            })) ?? [],
        };
      })}
      templates={templates.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
      }))}
    />
  );
}
