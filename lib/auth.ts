import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyTotp } from "@/lib/totp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        code: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
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

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        if (user.twoFactorEnabled) {
          const code = String(credentials.code ?? "").trim();
          if (!code) return null;

          if (user.twoFactorMethod === "AUTHENTICATOR") {
            if (!user.totpSecret || !verifyTotp(code, user.totpSecret)) {
              return null;
            }
          } else if (
            !user.twoFactorCode ||
            user.twoFactorCode !== code ||
            !user.twoFactorCodeExp ||
            user.twoFactorCodeExp < new Date()
          ) {
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
