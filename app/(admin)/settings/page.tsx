import packageJson from "@/package.json";

import { SettingsShell } from "@/components/settings/settings-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";

const fixedPaymentMethods = [
  {
    key: "BANK_TRANSFER",
    label: "Bank Transfer",
    sortOrder: 10,
  },
  {
    key: "BKASH",
    label: "bKash",
    sortOrder: 20,
  },
  {
    key: "NAGAD",
    label: "Nagad",
    sortOrder: 30,
  },
  {
    key: "WISE",
    label: "Wise",
    sortOrder: 40,
  },
  {
    key: "CASH",
    label: "Cash",
    sortOrder: 50,
  },
  {
    key: "PAYONEER",
    label: "Payoneer",
    sortOrder: 60,
  },
] as const;

function getDatabaseRegion() {
  const configuredRegion =
    process.env.DATABASE_REGION?.trim();

  if (configuredRegion) {
    return configuredRegion;
  }

  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    return "Not available";
  }

  try {
    const hostname =
      new URL(databaseUrl).hostname;

    const knownRegion = hostname.match(
      /(ap-southeast-\d|ap-south-\d|us-east-\d|us-west-\d|eu-central-\d|eu-west-\d)/
    );

    return (
      knownRegion?.[1] ??
      "Not available"
    );
  } catch {
    return "Not available";
  }
}

function formatSystemDate(
  value: string | undefined
) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
    return value;
  }

  return parsedDate.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

export default async function SettingsPage() {
  const session = await auth();

  const isAdmin =
    !!session?.user &&
    ADMIN_ROLES.includes(
      session.user.role
    );

  const [
    rates,
    settings,
    skills,
    team,
    paymentMethods,
    templates,
  ] = await Promise.all([
    prisma.exchangeRate.findMany({
      orderBy: {
        code: "asc",
      },
    }),

    prisma.setting.findMany(),

    prisma.skill.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
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
      orderBy: {
        name: "asc",
      },
      include: {
        skills: {
          select: {
            id: true,
            name: true,
          },
        },
        permissions: {
          orderBy: {
            resource: "asc",
          },
        },
      },
    }),

    prisma.paymentMethod.findMany({
      where: {
        key: {
          not: null,
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        bankAccounts: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    }),

    prisma.commonTask.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    }),
  ]);

  const settingsMap =
    Object.fromEntries(
      settings.map((setting) => [
        setting.key,
        setting.value,
      ])
    );

  const systemInfo = {
    isAdmin,

    version:
      packageJson.version,

    buildNumber:
      process.env
        .NEXT_PUBLIC_BUILD_NUMBER ??
      "1",

    environment:
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",

    nextVersion:
      packageJson.dependencies.next ??
      "Unknown",

    nodeVersion:
      process.version,

    databaseProvider:
      "PostgreSQL",

    databaseRegion:
      getDatabaseRegion(),

    deploymentId:
      process.env
        .VERCEL_DEPLOYMENT_ID ??
      process.env
        .VERCEL_GIT_COMMIT_SHA ??
      "Not available",

    lastDeploymentAt:
      formatSystemDate(
        process.env
          .NEXT_PUBLIC_DEPLOYED_AT
      ),

    lastUpdatedAt:
      formatSystemDate(
        settingsMap[
          "site.lastUpdatedAt"
        ] ??
          settingsMap[
            "system.lastUpgradeAt"
          ]
      ),

    siteName:
      settingsMap["site.name"] ??
      settingsMap[
        "brand.siteName"
      ] ??
      "AP Tech Hub",

    applicationName:
      settingsMap[
        "site.applicationName"
      ] ??
      "AP Tech Hub",

    companyName:
      settingsMap[
        "site.companyName"
      ] ??
      "AP Tech Agency",

    ownerName:
      isAdmin
        ? settingsMap[
            "site.ownerName"
          ] ?? ""
        : "",

    developerName:
      settingsMap[
        "site.developerName"
      ] ??
      "AP Tech Agency",

    developerWebsite:
      settingsMap[
        "site.developerWebsite"
      ] ??
      "https://aptechagency.com",

    supportEmail:
      settingsMap[
        "site.supportEmail"
      ] ??
      "",

    supportPhone:
      isAdmin
        ? settingsMap[
            "site.supportPhone"
          ] ?? ""
        : "",

    websiteUrl:
      settingsMap[
        "site.websiteUrl"
      ] ??
      "https://aptechagency.com",

    copyrightText:
      settingsMap[
        "site.copyright"
      ] ??
      `© ${new Date().getFullYear()} AP Tech Agency. All rights reserved.`,

    releaseNotes:
      settingsMap[
        "site.releaseNotes"
      ] ??
      "",

    systemStatus:
      settingsMap[
        "site.systemStatus"
      ] ??
      "ACTIVE",

    maintenanceMessage:
      isAdmin
        ? settingsMap[
            "site.maintenanceMessage"
          ] ?? ""
        : "",

    internalNotes:
      isAdmin
        ? settingsMap[
            "site.internalNotes"
          ] ?? ""
        : "",

    rollbackRetentionMonths:
      settingsMap[
        "system.rollbackRetentionMonths"
      ] ??
      "2",

    lastUpgradeAt:
      formatSystemDate(
        settingsMap[
          "system.lastUpgradeAt"
        ]
      ),

    lastUpgradeBy:
      isAdmin
        ? settingsMap[
            "system.lastUpgradeBy"
          ] ?? ""
        : "",

    lastUpgradeNote:
      isAdmin
        ? settingsMap[
            "system.lastUpgradeNote"
          ] ?? ""
        : "",
  };

  return (
    <SettingsShell
      rates={rates.map((rate) => ({
        code: rate.code,
        rate: Number(
          rate.rateToBdt
        ),
        updatedAt:
          rate.updatedAt.toISOString(),
      }))}
      settings={settingsMap}
      skills={skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        userCount:
          skill._count.users,
      }))}
      team={team.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        payoutSet:
          Boolean(
            user.payoutMethod
          ),
        skillIds:
          user.skills.map(
            (skill) => skill.id
          ),
        skillNames:
          user.skills.map(
            (skill) => skill.name
          ),
        permissions:
          user.permissions.map(
            (permission) => ({
              resource:
                permission.resource,
              canCreate:
                permission.canCreate,
              canRead:
                permission.canRead,
              canUpdate:
                permission.canUpdate,
              canDelete:
                permission.canDelete,
            })
          ),
      }))}
      paymentMethods={fixedPaymentMethods.map(
        (method) => {
          const saved =
            paymentMethods.find(
              (paymentMethod) =>
                paymentMethod.key ===
                method.key
            );

          return {
            id:
              saved?.id ??
              method.key,
            key:
              method.key,
            label:
              saved?.label ??
              method.label,
            active:
              saved?.active ??
              false,
            details:
              saved?.details ??
              "",
            instructions:
              saved?.instructions ??
              undefined,
            warning:
              saved?.warning ??
              undefined,
            receiverNumber:
              saved?.receiverNumber ??
              undefined,
            accountType:
              saved?.accountType ??
              undefined,
            wiseEmail:
              saved?.wiseEmail ??
              undefined,
            wiseAccountName:
              saved?.wiseAccountName ??
              undefined,
            wisePaymentUrl:
              saved?.wisePaymentUrl ??
              undefined,
            wiseTransferDetails:
              saved?.wiseTransferDetails ??
              undefined,
            cashReceiverInfo:
              saved?.cashReceiverInfo ??
              undefined,
            payoneerDirectEnabled:
              saved
                ?.payoneerDirectEnabled ??
              false,
            payoneerMode:
              saved?.payoneerMode ??
              undefined,
            payoneerMerchantId:
              saved
                ?.payoneerMerchantId ??
              undefined,
            payoneerButtonLabel:
              saved
                ?.payoneerButtonLabel ??
              undefined,
            sortOrder:
              saved?.sortOrder ??
              method.sortOrder,

            bankAccounts:
              saved?.bankAccounts.map(
                (account) => ({
                  id:
                    account.id,
                  bankName:
                    account.bankName,
                  accountName:
                    account.accountName,
                  accountNumber:
                    account.accountNumber,
                  branchName:
                    account.branchName ??
                    undefined,
                  routingNumber:
                    account.routingNumber ??
                    undefined,
                  swiftCode:
                    account.swiftCode ??
                    undefined,
                  currency:
                    account.currency,
                  instructions:
                    account.instructions ??
                    undefined,
                  active:
                    account.active,
                  sortOrder:
                    account.sortOrder,
                })
              ) ?? [],
          };
        }
      )}
      templates={templates.map(
        (template) => ({
          id: template.id,
          title: template.title,
          priority:
            template.priority,
        })
      )}
      systemInfo={systemInfo}
    />
  );
}