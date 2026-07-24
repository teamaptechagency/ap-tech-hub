import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clientId: string | null;
    } & DefaultSession["user"];
    impersonation?: {
      active: boolean;
      adminId: string;
      adminName: string;
      adminEmail: string;
      targetId: string;
      targetName: string;
      targetEmail: string;
      targetRole: string;
    };
  }

  interface User {
    role: string;
    clientId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    clientId?: string | null;
  }
}
