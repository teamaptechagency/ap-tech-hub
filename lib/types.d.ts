import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clientId: string | null;
      partnerType?: string | null;
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
    /** Super admin previewing the employee interface as themselves. */
    viewingAsEmployee?: boolean;
  }

  interface User {
    role: string;
    clientId?: string | null;
    partnerType?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    clientId?: string | null;
    partnerType?: string | null;
  }
}
