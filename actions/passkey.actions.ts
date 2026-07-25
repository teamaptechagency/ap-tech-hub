"use server";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  consumeChallenge,
  defaultPasskeyLabel,
  PASSKEY_CHALLENGE_COOKIE,
  passkeyRelyingParty,
  passkeyTransports,
  saveChallenge,
} from "@/lib/passkey";

async function setChallengeCookie(handle: string) {
  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_CHALLENGE_COOKIE, handle, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
}

async function readChallengeCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(PASSKEY_CHALLENGE_COOKIE)?.value;
}

async function clearChallengeCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PASSKEY_CHALLENGE_COOKIE);
}

// ============================================
// REGISTRATION (adding a fingerprint to an account)
// ============================================

export async function startPasskeyRegistration() {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };

  try {
    const { rpID, rpName } = await passkeyRelyingParty();

    const existing = await prisma.userPasskey.findMany({
      where: { userId: session.user.id },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: session.user.email ?? "user",
      userDisplayName: session.user.name ?? undefined,
      attestationType: "none",
      // Stops the same device being enrolled twice.
      excludeCredentials: existing.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkeyTransports(passkey.transports),
      })),
      authenticatorSelection: {
        // "platform" = the fingerprint/face sensor built into the device,
        // rather than a separate USB security key.
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
    });

    const handle = await saveChallenge({
      challenge: options.challenge,
      purpose: "REGISTER",
      userId: session.user.id,
    });
    await setChallengeCookie(handle);

    return { success: true, options };
  } catch (error) {
    console.error("Failed to start passkey registration:", error);
    return { error: "Could not start fingerprint setup" };
  }
}

export async function finishPasskeyRegistration(
  response: RegistrationResponseJSON,
  label?: string
) {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };

  try {
    const handle = await readChallengeCookie();
    const record = await consumeChallenge(handle, "REGISTER");
    await clearChallengeCookie();

    if (!record || record.userId !== session.user.id) {
      return { error: "This setup attempt expired. Please try again." };
    }

    const { rpID, origin } = await passkeyRelyingParty();

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: record.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { error: "Fingerprint could not be verified" };
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const headerList = await headers();
    const name =
      label?.trim() || defaultPasskeyLabel(headerList.get("user-agent"));

    await prisma.userPasskey.create({
      data: {
        userId: session.user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports?.join(",") ?? null,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        label: name,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          actorId: session.user.id,
          action: "PASSKEY_ADDED",
          entity: "User",
          entityId: session.user.id,
          meta: name,
        },
      })
      .catch(() => null);

    revalidatePath("/profile");
    revalidatePath("/e/profile");
    revalidatePath("/c/profile");
    revalidatePath("/p/profile");

    return { success: true };
  } catch (error) {
    console.error("Failed to finish passkey registration:", error);
    return { error: "Could not save this fingerprint" };
  }
}

export async function renamePasskey(id: string, label: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };

  const name = label.trim();
  if (!name) return { error: "Name cannot be empty" };

  // Scoped by userId so one user can never rename another's passkey.
  const result = await prisma.userPasskey.updateMany({
    where: { id, userId: session.user.id },
    data: { label: name.slice(0, 60) },
  });

  if (!result.count) return { error: "Passkey not found" };

  revalidatePath("/profile");
  revalidatePath("/e/profile");
  revalidatePath("/c/profile");
  revalidatePath("/p/profile");
  return { success: true };
}

export async function deletePasskey(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };

  const result = await prisma.userPasskey.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (!result.count) return { error: "Passkey not found" };

  await prisma.auditLog
    .create({
      data: {
        actorId: session.user.id,
        action: "PASSKEY_REMOVED",
        entity: "User",
        entityId: session.user.id,
      },
    })
    .catch(() => null);

  revalidatePath("/profile");
  revalidatePath("/e/profile");
  revalidatePath("/c/profile");
  revalidatePath("/p/profile");
  return { success: true };
}

// ============================================
// AUTHENTICATION (signing in, or passing 2FA)
// ============================================

export async function startPasskeyLogin(email?: string) {
  try {
    const { rpID } = await passkeyRelyingParty();

    // With an email we can narrow to that account's credentials; without one
    // the browser offers whatever discoverable passkey it holds for this site.
    const targetEmail = email?.trim().toLowerCase();
    const user = targetEmail
      ? await prisma.user.findUnique({
          where: { email: targetEmail },
          select: { id: true, accountStatus: true },
        })
      : null;

    const credentials =
      user && user.accountStatus === "ACTIVE"
        ? await prisma.userPasskey.findMany({
            where: { userId: user.id },
            select: { credentialId: true, transports: true },
          })
        : [];

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: credentials.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkeyTransports(passkey.transports),
      })),
    });

    const handle = await saveChallenge({
      challenge: options.challenge,
      purpose: "LOGIN",
      // Deliberately not bound to a user: the credential itself identifies
      // the account, and binding it would leak whether an email exists.
      userId: null,
    });
    await setChallengeCookie(handle);

    return { success: true, options };
  } catch (error) {
    console.error("Failed to start passkey login:", error);
    return { error: "Could not start fingerprint sign-in" };
  }
}

/**
 * Verifies an assertion and returns a one-time token that the NextAuth
 * credentials provider exchanges for a session. The token is written to the
 * user's twoFactorCode column, which already has an expiry, so a verified
 * passkey cannot be replayed later.
 */
export async function verifyPasskeyAssertion(
  response: AuthenticationResponseJSON
) {
  try {
    const handle = await readChallengeCookie();
    const record = await consumeChallenge(handle, "LOGIN");
    await clearChallengeCookie();

    if (!record) {
      return { error: "This sign-in attempt expired. Please try again." };
    }

    const passkey = await prisma.userPasskey.findUnique({
      where: { credentialId: response.id },
      include: {
        user: {
          select: { id: true, email: true, accountStatus: true },
        },
      },
    });

    if (!passkey) return { error: "This device is not registered" };
    if (passkey.user.accountStatus !== "ACTIVE") {
      return { error: "This account is not active" };
    }

    const { rpID, origin } = await passkeyRelyingParty();

    const verification = await verifyAuthenticationResponse({
      response,
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

    // A counter that fails to advance is the signal for a cloned authenticator.
    // Some platform authenticators legitimately always report 0, so only treat
    // it as suspicious when the stored counter was already non-zero.
    if (passkey.counter > 0 && newCounter <= passkey.counter) {
      console.error("Passkey counter did not advance", {
        passkeyId: passkey.id,
      });
      return { error: "This device could not be verified. Contact support." };
    }

    const token = `pk_${randomToken()}`;

    await prisma.$transaction([
      prisma.userPasskey.update({
        where: { id: passkey.id },
        data: { counter: newCounter, lastUsedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: passkey.userId },
        data: {
          twoFactorCode: token,
          twoFactorCodeExp: new Date(Date.now() + 2 * 60 * 1000),
        },
      }),
    ]);

    return { success: true, email: passkey.user.email, token };
  } catch (error) {
    console.error("Failed to verify passkey:", error);
    return { error: "Fingerprint sign-in failed" };
  }
}

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
