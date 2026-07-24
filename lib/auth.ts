import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyTotp } from "@/lib/totp";
import { cookies } from "next/headers";

function hasTwoFactorMethod(value: string | null | undefined, method: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .includes(method);
}

const nextAuth = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        deviceToken: {},
        code: {},
        authLogin: {},
        authMethod: {},
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = String(credentials.email).trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            clientId: true,
            accountStatus: true,
            twoFactorEnabled: true,
            twoFactorMethod: true,
            twoFactorCode: true,
            twoFactorCodeExp: true,
            totpSecret: true,
          },
        });
        if (!user) return null;
        if (user.accountStatus !== "ACTIVE") return null;

        const authLogin = String(credentials.authLogin ?? "") === "true";
        if (authLogin) {
          const code = String(credentials.code ?? "").trim();
          const authMethod = String(
            credentials.authMethod ?? "AUTHENTICATOR"
          ).toUpperCase();
          const validAuthenticator =
            authMethod === "AUTHENTICATOR" &&
            user.twoFactorEnabled &&
            hasTwoFactorMethod(user.twoFactorMethod, "AUTHENTICATOR") &&
            !!user.totpSecret &&
            verifyTotp(code, user.totpSecret);
          const validSentCode =
            ((authMethod === "EMAIL" && user.accountStatus === "ACTIVE") ||
              (authMethod === "WHATSAPP" &&
                user.twoFactorEnabled &&
                hasTwoFactorMethod(user.twoFactorMethod, "WHATSAPP"))) &&
            !!user.twoFactorCode &&
            user.twoFactorCode === code &&
            !!user.twoFactorCodeExp &&
            user.twoFactorCodeExp >= new Date();

          if (!validAuthenticator && !validSentCode) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            clientId: user.clientId,
          };
        }

        if (!credentials.password) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        const needsSecurityCode =
          user.twoFactorEnabled &&
          (hasTwoFactorMethod(user.twoFactorMethod, "AUTHENTICATOR") ||
            hasTwoFactorMethod(user.twoFactorMethod, "WHATSAPP"));

        if (needsSecurityCode) {
          const code = String(credentials.code ?? "").trim();
          if (!code) return null;

          const validAuthenticator =
            hasTwoFactorMethod(user.twoFactorMethod, "AUTHENTICATOR") &&
            !!user.totpSecret &&
            verifyTotp(code, user.totpSecret);
          const validSentCode =
            hasTwoFactorMethod(user.twoFactorMethod, "WHATSAPP") &&
            !!user.twoFactorCode &&
            user.twoFactorCode === code &&
            !!user.twoFactorCodeExp &&
            user.twoFactorCodeExp >= new Date();

          if (!validAuthenticator && !validSentCode) {
            return null;
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clientId: user.clientId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.clientId = user.clientId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.clientId = (token.clientId as string) ?? null;
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;
export const rawAuth = nextAuth.auth;

async function getEffectiveSession() {
  const session = await nextAuth.auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return session;
  }

  const cookieStore = await cookies();
  const targetId = cookieStore.get("ap_impersonate_user_id")?.value;
  if (!targetId || targetId === session.user.id) return session;

  const target = await prisma.user
    .findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clientId: true,
        image: true,
        photoUrl: true,
      },
    })
    .catch(() => null);

  if (!target) return session;

  return {
    ...session,
    user: {
      ...session.user,
      id: target.id,
      name: target.name,
      email: target.email,
      image: target.photoUrl ?? target.image ?? session.user.image,
      role: target.role,
      clientId: target.clientId ?? null,
    },
    impersonation: {
      active: true,
      adminId: session.user.id,
      adminName: session.user.name ?? "Super admin",
      adminEmail: session.user.email ?? "",
      targetId: target.id,
      targetName: target.name,
      targetEmail: target.email,
      targetRole: target.role,
    },
  };
}

export const auth = ((...args: unknown[]) => {
  if (args.length > 0) {
    return (nextAuth.auth as (...authArgs: unknown[]) => unknown)(...args);
  }

  return getEffectiveSession();
}) as typeof nextAuth.auth;
