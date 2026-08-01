"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { homeFor } from "@/lib/roles";
import { notify } from "@/lib/notify";
import {
  consumeChallenge,
  passkeyRelyingParty,
  passkeyTransports,
  saveChallenge,
} from "@/lib/passkey";
import {
  checkLoginAllowed,
  clearFailedLogin,
  ensureLoginSecurityTables,
  getClientIpFromHeaders,
  getDeviceInfoFromHeaders,
  recordFailedLogin,
  rememberLoginDevice,
} from "@/lib/login-security";

const REQUEST_TTL_MS = 2 * 60 * 1000;

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================
// WEB SIDE — request a sign-in, then poll for it
// being approved elsewhere.
// ============================================

type RequestMobileLoginResult =
  | { error: string }
  | { success: true; requestId: string; expiresInSeconds: number };

export async function requestMobileLogin(
  emailInput: string
): Promise<RequestMobileLoginResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email) return { error: "Enter your email first" };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, accountStatus: true },
  });
  if (!user || user.accountStatus !== "ACTIVE") {
    return { error: "This login method is not available for this account" };
  }

  const headerList = await headers();
  const ipAddress = getClientIpFromHeaders(headerList);
  const deviceInfo = getDeviceInfoFromHeaders(headerList);

  const request = await prisma.mobileLoginRequest.create({
    data: {
      userId: user.id,
      ipAddress,
      userAgent: deviceInfo.userAgent,
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
    },
  });

  await notify({
    userId: user.id,
    title: "Sign-in request from web",
    body: "Someone is trying to sign in to your account on the web. Tap to review.",
    // Deliberately not under /login/* — proxy.ts's PUBLIC_PATHS bounces any
    // already-logged-in visitor away from anything starting with "/login",
    // which is exactly the audience this page needs.
    href: `/approve-signin/${request.id}`,
  });

  return {
    success: true,
    requestId: request.id,
    expiresInSeconds: REQUEST_TTL_MS / 1000,
  };
}

// Explicit discriminated union — without it, multiple differently-shaped
// return statements infer as one loosely-merged type with optional props
// instead of a real union, and checking `status` wouldn't safely narrow
// `token`/`email` at the call site (a TypeScript build-break pattern this
// project has hit before).
type MobileLoginStatusResult =
  | { status: "PENDING" }
  | { status: "DENIED" }
  | { status: "EXPIRED" }
  | { status: "APPROVED"; token: string; email: string };

export async function getMobileLoginStatus(
  requestId: string
): Promise<MobileLoginStatusResult> {
  const request = await prisma.mobileLoginRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { email: true } } },
  });
  if (!request) return { status: "EXPIRED" };

  if (request.status === "PENDING" && request.expiresAt < new Date()) {
    await prisma.mobileLoginRequest
      .update({ where: { id: request.id }, data: { status: "EXPIRED" } })
      .catch(() => null);
    return { status: "EXPIRED" };
  }

  if (request.status === "APPROVED") {
    // Single delivery: flip to CONSUMED atomically so a second concurrent
    // poll never gets a second chance to read the token.
    const claimed = await prisma.mobileLoginRequest.updateMany({
      where: { id: request.id, status: "APPROVED" },
      data: { status: "CONSUMED" },
    });
    if (claimed.count === 0) return { status: "PENDING" };

    return {
      status: "APPROVED",
      token: request.approvalToken!,
      email: request.user.email,
    };
  }

  if (request.status === "DENIED") return { status: "DENIED" };
  if (request.status === "CONSUMED") return { status: "EXPIRED" };
  return { status: "PENDING" };
}

/**
 * Exchanges the approval token the poll above returned for a real session,
 * on the browser that originally asked for it. Mirrors loginWithPasskey.
 */
export async function loginWithMobileApproval(input: {
  email: string;
  token: string;
  deviceToken?: string;
  next?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const requestHeaders = await headers();
  const ipAddress = getClientIpFromHeaders(requestHeaders);

  await ensureLoginSecurityTables();

  const loginAllowed = await checkLoginAllowed(email, ipAddress);
  if (!loginAllowed.allowed) {
    return {
      error: loginAllowed.message,
      contactAdmin: loginAllowed.contactAdmin ?? false,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, partnerType: true, accountStatus: true },
  });

  if (!user || user.accountStatus !== "ACTIVE") {
    return { error: "This account is not active" };
  }

  try {
    await signIn("credentials", {
      email,
      mobileApprovalToken: input.token,
      deviceToken: input.deviceToken?.trim() ?? "",
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const failed = await recordFailedLogin(email, ipAddress);
      return {
        error: "Sign-in approval failed. Please try again.",
        contactAdmin: failed.contactAdmin ?? false,
      };
    }
    throw error;
  }

  await clearFailedLogin(email, ipAddress);

  const deviceToken = await rememberLoginDevice({
    userId: user.id,
    role: user.role,
    deviceToken: input.deviceToken,
    ipAddress,
    headers: requestHeaders,
  });

  const nextPath =
    input.next?.startsWith("/") && !input.next.startsWith("//")
      ? input.next
      : "";

  return {
    redirectTo: nextPath || homeFor(user.role, user.partnerType),
    deviceToken,
  };
}

// ============================================
// MOBILE SIDE — review and approve/deny, from
// the account's own already-logged-in session.
// ============================================

type LoadOwnPendingRequestResult =
  | { error: string }
  | {
      userId: string;
      request: NonNullable<
        Awaited<ReturnType<typeof prisma.mobileLoginRequest.findUnique>>
      >;
    };

// Explicit union, and only the userId (not the full session) — an inferred
// return type here merges into one loosely-optional shape where every
// branch structurally has an `error` property, which broke `"error" in
// loaded` narrowing at every call site (every branch "has" error, so the
// success branch never got excluded — this is what failed the build).
async function loadOwnPendingRequest(
  requestId: string
): Promise<LoadOwnPendingRequestResult> {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };

  const request = await prisma.mobileLoginRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.userId !== session.user.id) {
    return { error: "This request was not found" };
  }
  if (request.status !== "PENDING" || request.expiresAt < new Date()) {
    return {
      error: "This sign-in request has expired or was already handled",
    };
  }

  return { userId: session.user.id, request };
}

type MobileLoginRequestInfoResult =
  | { error: string }
  | {
      success: true;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
      hasPasskey: boolean;
    };

export async function getMobileLoginRequestInfo(
  requestId: string
): Promise<MobileLoginRequestInfoResult> {
  const loaded = await loadOwnPendingRequest(requestId);
  if ("error" in loaded) return loaded;

  const hasPasskey =
    (await prisma.userPasskey.count({
      where: { userId: loaded.userId },
    })) > 0;

  return {
    success: true,
    ipAddress: loaded.request.ipAddress,
    userAgent: loaded.request.userAgent,
    createdAt: loaded.request.createdAt.toISOString(),
    hasPasskey,
  };
}

export async function denyMobileLogin(requestId: string) {
  const loaded = await loadOwnPendingRequest(requestId);
  if ("error" in loaded) return loaded;

  await prisma.mobileLoginRequest.update({
    where: { id: requestId },
    data: { status: "DENIED" },
  });
  return { success: true };
}

type MobileLoginStepUpResult =
  | { error: string }
  | {
      success: true;
      options: Awaited<ReturnType<typeof generateAuthenticationOptions>>;
      handle: string;
    };

/** Starts the fingerprint (STEP_UP) ceremony that "Access" requires. */
export async function startMobileLoginStepUp(
  requestId: string
): Promise<MobileLoginStepUpResult> {
  const loaded = await loadOwnPendingRequest(requestId);
  if ("error" in loaded) return loaded;

  const passkeys = await prisma.userPasskey.findMany({
    where: { userId: loaded.userId },
    select: { credentialId: true, transports: true },
  });
  if (passkeys.length === 0) {
    return {
      error:
        "No fingerprint is registered on this device. Add one from Profile first.",
    };
  }

  const { rpID } = await passkeyRelyingParty();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkeyTransports(passkey.transports),
    })),
  });

  const handle = await saveChallenge({
    challenge: options.challenge,
    purpose: "STEP_UP",
    userId: loaded.userId,
  });

  return { success: true, options, handle };
}

export async function approveMobileLogin(input: {
  requestId: string;
  handle: string;
  response: AuthenticationResponseJSON;
}) {
  const loaded = await loadOwnPendingRequest(input.requestId);
  if ("error" in loaded) return loaded;
  const { userId, request } = loaded;

  const record = await consumeChallenge(input.handle, "STEP_UP");
  if (!record || record.userId !== userId) {
    return { error: "This approval attempt expired. Please try again." };
  }

  const passkey = await prisma.userPasskey.findUnique({
    where: { credentialId: input.response.id },
  });
  if (!passkey || passkey.userId !== userId) {
    return { error: "This fingerprint is not registered to your account" };
  }

  const { rpID, origin } = await passkeyRelyingParty();
  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: record.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: passkey.counter,
      transports: passkeyTransports(passkey.transports),
    },
  });

  if (!verification.verified) {
    return { error: "Fingerprint could not be verified" };
  }

  const { newCounter } = verification.authenticationInfo;
  if (passkey.counter > 0 && newCounter <= passkey.counter) {
    console.error("Passkey counter did not advance", { passkeyId: passkey.id });
    return { error: "This device could not be verified. Contact support." };
  }

  const approvalToken = `ml_${randomToken()}`;

  await prisma.$transaction([
    prisma.userPasskey.update({
      where: { id: passkey.id },
      data: { counter: newCounter, lastUsedAt: new Date() },
    }),
    prisma.mobileLoginRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        approvalToken,
        approvalTokenExp: new Date(Date.now() + REQUEST_TTL_MS),
      },
    }),
  ]);

  return { success: true };
}
