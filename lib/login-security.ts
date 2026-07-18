import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppNotification } from "@/lib/whatsapp";

export type LoginBlockResult =
  | { allowed: true }
  | { allowed: false; message: string; contactAdmin?: boolean };

type SecurityRecordRow = {
  failedCount: number;
  holdLevel: number;
  holdUntil: Date | null;
  hardBlocked: boolean;
};

const ADMIN_CONTACT = "nazmulha30@gmail.com";

export function getClientIpFromHeaders(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const vercelIp = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();

  return forwardedFor || realIp || vercelIp || "unknown";
}

export function getDeviceInfoFromHeaders(headers: Headers) {
  return {
    userAgent: headers.get("user-agent")?.slice(0, 500) ?? null,
    country:
      headers.get("x-vercel-ip-country") ||
      headers.get("cf-ipcountry") ||
      null,
    city: headers.get("x-vercel-ip-city") || null,
    region: headers.get("x-vercel-ip-country-region") || null,
  };
}

export async function ensureLoginSecurityTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LoginSecurityRecord" (
      "id" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "email" TEXT,
      "ipAddress" TEXT NOT NULL,
      "failedCount" INTEGER NOT NULL DEFAULT 0,
      "holdLevel" INTEGER NOT NULL DEFAULT 0,
      "holdUntil" TIMESTAMP(3),
      "hardBlocked" BOOLEAN NOT NULL DEFAULT false,
      "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoginSecurityRecord_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "IpBlock" (
      "id" TEXT NOT NULL,
      "ipAddress" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "blockedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
      "blockedUntil" TIMESTAMP(3),
      "unlockedAt" TIMESTAMP(3),
      "unlockToken" TEXT,
      "unlockTokenExp" TIMESTAMP(3),
      "note" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "IpBlock_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LoginHelpRequest" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "ipAddress" TEXT,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "note" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LoginHelpRequest_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserLoginPin" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "pinHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserLoginPin_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserLoginDevice" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "deviceToken" TEXT NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "country" TEXT,
      "city" TEXT,
      "region" TEXT,
      "trusted" BOOLEAN NOT NULL DEFAULT true,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserLoginDevice_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "LoginSecurityRecord_key_key" ON "LoginSecurityRecord"("key");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "IpBlock_ipAddress_key" ON "IpBlock"("ipAddress");`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "IpBlock" ADD COLUMN IF NOT EXISTS "unlockToken" TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "IpBlock" ADD COLUMN IF NOT EXISTS "unlockTokenExp" TIMESTAMP(3);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "IpBlock_unlockToken_key" ON "IpBlock"("unlockToken");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "IpBlock_unlockToken_idx" ON "IpBlock"("unlockToken");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LoginHelpRequest_status_idx" ON "LoginHelpRequest"("status");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "UserLoginPin_userId_key" ON "UserLoginPin"("userId");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "UserLoginDevice_deviceToken_key" ON "UserLoginDevice"("deviceToken");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "UserLoginDevice_userId_idx" ON "UserLoginDevice"("userId");`
  );
}

export async function checkLoginAllowed(email: string, ipAddress: string) {
  await ensureLoginSecurityTables();

  const ipBlocks = await prisma.$queryRaw<
    { blockedUntil: Date | null; reason: string }[]
  >`
    SELECT "blockedUntil", "reason"
    FROM "IpBlock"
    WHERE "ipAddress" = ${ipAddress}
      AND "active" = true
    LIMIT 1
  `;

  const ipBlock = ipBlocks[0];
  if (ipBlock) {
    if (ipBlock.blockedUntil && ipBlock.blockedUntil <= new Date()) {
      await prisma.$executeRaw`
        UPDATE "IpBlock"
        SET "active" = false, "unlockedAt" = ${new Date()}, "updatedAt" = ${new Date()}
        WHERE "ipAddress" = ${ipAddress}
      `;
    } else {
      return {
        allowed: false,
        contactAdmin: true,
        message: `Too many unsafe login attempts were detected. Contact administration: ${ADMIN_CONTACT}`,
      } satisfies LoginBlockResult;
    }
  }

  const rows = await getSecurityRecord(email, ipAddress);
  const record = rows[0];
  if (!record) return { allowed: true } satisfies LoginBlockResult;

  if (record.hardBlocked) {
    return {
      allowed: false,
      contactAdmin: true,
      message: `Login is blocked for security. Contact administration: ${ADMIN_CONTACT}`,
    } satisfies LoginBlockResult;
  }

  if (record.holdUntil && record.holdUntil > new Date()) {
    const minutes = Math.max(
      1,
      Math.ceil((record.holdUntil.getTime() - Date.now()) / 60_000)
    );

    return {
      allowed: false,
      message: `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    } satisfies LoginBlockResult;
  }

  return { allowed: true } satisfies LoginBlockResult;
}

export async function recordFailedLogin(email: string, ipAddress: string) {
  await ensureLoginSecurityTables();

  const rows = await getSecurityRecord(email, ipAddress);
  const record = rows[0];
  const key = loginKey(email, ipAddress);
  const now = new Date();

  if (!record) {
    await prisma.$executeRaw`
      INSERT INTO "LoginSecurityRecord"
        ("id", "key", "email", "ipAddress", "failedCount", "holdLevel", "lastAttemptAt", "updatedAt")
      VALUES
        (${randomUUID()}, ${key}, ${email}, ${ipAddress}, 1, 0, ${now}, ${now})
    `;
    return {
      message: "Invalid email or password",
    };
  }

  const nextFailedCount = record.failedCount + 1;
  const threshold = record.holdLevel === 0 ? 5 : 3;

  if (nextFailedCount < threshold) {
    await prisma.$executeRaw`
      UPDATE "LoginSecurityRecord"
      SET "failedCount" = ${nextFailedCount}, "lastAttemptAt" = ${now}, "updatedAt" = ${now}
      WHERE "key" = ${key}
    `;
    return { message: "Invalid email or password" };
  }

  if (record.holdLevel === 0) {
    const holdUntil = new Date(Date.now() + 10 * 60 * 1000);
    await setLoginHold(key, 1, holdUntil);
    return { message: "Too many wrong passwords. Login is on hold for 10 minutes." };
  }

  if (record.holdLevel === 1) {
    const holdUntil = new Date(Date.now() + 30 * 60 * 1000);
    await setLoginHold(key, 2, holdUntil);
    return { message: "Too many wrong passwords again. Login is on hold for 30 minutes." };
  }

  await prisma.$executeRaw`
    UPDATE "LoginSecurityRecord"
    SET "failedCount" = 0, "hardBlocked" = true, "lastAttemptAt" = ${now}, "updatedAt" = ${now}
    WHERE "key" = ${key}
  `;
  const unlockToken = randomUUID();
  const unlockTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO "IpBlock"
      ("id", "ipAddress", "reason", "active", "blockedBy", "unlockToken", "unlockTokenExp", "updatedAt")
    VALUES
      (${randomUUID()}, ${ipAddress}, 'Repeated failed login attempts', true, 'SYSTEM', ${unlockToken}, ${unlockTokenExp}, ${now})
    ON CONFLICT ("ipAddress") DO UPDATE SET
      "active" = true,
      "reason" = EXCLUDED."reason",
      "blockedBy" = 'SYSTEM',
      "unlockedAt" = NULL,
      "unlockToken" = EXCLUDED."unlockToken",
      "unlockTokenExp" = EXCLUDED."unlockTokenExp",
      "updatedAt" = EXCLUDED."updatedAt"
  `;

  await sendLoginUnlockNotice(email, unlockToken).catch((error) => {
    console.error("Login unlock WhatsApp notice failed:", error);
  });

  return {
    contactAdmin: true,
    message: `Login is blocked for security. Contact administration: ${ADMIN_CONTACT}`,
  };
}

export async function unlockByToken(token: string) {
  await ensureLoginSecurityTables();
  const cleanToken = token.trim();
  if (!cleanToken) return { error: "Invalid unlock link" };

  const rows = await prisma.$queryRaw<
    { ipAddress: string; unlockTokenExp: Date | null }[]
  >`
    SELECT "ipAddress", "unlockTokenExp"
    FROM "IpBlock"
    WHERE "unlockToken" = ${cleanToken}
      AND "active" = true
    LIMIT 1
  `;

  const block = rows[0];
  if (!block) return { error: "Unlock link is invalid or already used" };
  if (block.unlockTokenExp && block.unlockTokenExp < new Date()) {
    return { error: "Unlock link expired. Please contact administration." };
  }

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "IpBlock"
    SET "active" = false,
        "unlockedAt" = ${now},
        "unlockToken" = NULL,
        "unlockTokenExp" = NULL,
        "note" = 'Unlocked by secure link',
        "updatedAt" = ${now}
    WHERE "unlockToken" = ${cleanToken}
  `;
  await prisma.$executeRaw`
    UPDATE "LoginSecurityRecord"
    SET "hardBlocked" = false,
        "failedCount" = 0,
        "holdUntil" = NULL,
        "updatedAt" = ${now}
    WHERE "ipAddress" = ${block.ipAddress}
  `;

  return { success: true };
}

export async function clearFailedLogin(email: string, ipAddress: string) {
  await ensureLoginSecurityTables();
  await prisma.$executeRaw`
    DELETE FROM "LoginSecurityRecord"
    WHERE "key" = ${loginKey(email, ipAddress)}
  `;
}

export async function rememberLoginDevice(input: {
  userId: string;
  deviceToken?: string;
  ipAddress: string;
  headers: Headers;
}) {
  await ensureLoginSecurityTables();

  const deviceToken = input.deviceToken?.trim() || randomUUID();
  const deviceInfo = getDeviceInfoFromHeaders(input.headers);
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "UserLoginDevice"
      ("id", "userId", "deviceToken", "ipAddress", "userAgent", "country", "city", "region", "trusted", "lastSeenAt", "updatedAt")
    VALUES
      (${randomUUID()}, ${input.userId}, ${deviceToken}, ${input.ipAddress}, ${deviceInfo.userAgent}, ${deviceInfo.country}, ${deviceInfo.city}, ${deviceInfo.region}, true, ${now}, ${now})
    ON CONFLICT ("deviceToken") DO UPDATE SET
      "userId" = EXCLUDED."userId",
      "ipAddress" = EXCLUDED."ipAddress",
      "userAgent" = EXCLUDED."userAgent",
      "country" = EXCLUDED."country",
      "city" = EXCLUDED."city",
      "region" = EXCLUDED."region",
      "trusted" = true,
      "lastSeenAt" = EXCLUDED."lastSeenAt",
      "updatedAt" = EXCLUDED."updatedAt"
  `;

  return deviceToken;
}

export async function isRecentTrustedDevice(userId: string, deviceToken?: string) {
  if (!deviceToken?.trim()) return false;
  await ensureLoginSecurityTables();

  const recentAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "UserLoginDevice"
    WHERE "userId" = ${userId}
      AND "deviceToken" = ${deviceToken}
      AND "trusted" = true
      AND "lastSeenAt" >= ${recentAfter}
    LIMIT 1
  `;

  return rows.length > 0;
}

export async function getLoginPinHash(userId: string) {
  await ensureLoginSecurityTables();
  const rows = await prisma.$queryRaw<{ pinHash: string }[]>`
    SELECT "pinHash"
    FROM "UserLoginPin"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  return rows[0]?.pinHash ?? null;
}

export async function saveLoginPin(userId: string, pinHash: string) {
  await ensureLoginSecurityTables();
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "UserLoginPin"
      ("id", "userId", "pinHash", "updatedAt")
    VALUES
      (${randomUUID()}, ${userId}, ${pinHash}, ${now})
    ON CONFLICT ("userId") DO UPDATE SET
      "pinHash" = EXCLUDED."pinHash",
      "updatedAt" = EXCLUDED."updatedAt"
  `;
}

export async function getUserLoginDevices(userId: string) {
  await ensureLoginSecurityTables();
  return prisma.$queryRaw<
    {
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      country: string | null;
      city: string | null;
      region: string | null;
      trusted: boolean;
      lastSeenAt: Date;
      createdAt: Date;
    }[]
  >`
    SELECT "id", "ipAddress", "userAgent", "country", "city", "region", "trusted", "lastSeenAt", "createdAt"
    FROM "UserLoginDevice"
    WHERE "userId" = ${userId}
    ORDER BY "lastSeenAt" DESC
    LIMIT 10
  `;
}

function loginKey(email: string, ipAddress: string) {
  return `${email.toLowerCase()}|${ipAddress}`;
}

async function sendLoginUnlockNotice(email: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { phone: true, name: true },
  });
  if (!user?.phone) return;

  const base =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  await sendWhatsAppNotification({
    phone: user.phone,
    title: "Login blocked",
    body: `Hi ${user.name}, your AP Tech Hub login was blocked after repeated wrong attempts. If this was you, open the secure link and click Unlock me.`,
    href: `${base}/api/security/unlock?token=${encodeURIComponent(token)}`,
  });
}

function getSecurityRecord(email: string, ipAddress: string) {
  return prisma.$queryRaw<SecurityRecordRow[]>`
    SELECT "failedCount", "holdLevel", "holdUntil", "hardBlocked"
    FROM "LoginSecurityRecord"
    WHERE "key" = ${loginKey(email, ipAddress)}
    LIMIT 1
  `;
}

function setLoginHold(key: string, holdLevel: number, holdUntil: Date) {
  const now = new Date();

  return prisma.$executeRaw`
    UPDATE "LoginSecurityRecord"
    SET "failedCount" = 0,
        "holdLevel" = ${holdLevel},
        "holdUntil" = ${holdUntil},
        "lastAttemptAt" = ${now},
        "updatedAt" = ${now}
    WHERE "key" = ${key}
  `;
}
