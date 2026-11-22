import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export function wpNazmulEligible(user: {role?: string; email?: string|null; accountStatus?: string}|null|undefined) {
  return !!user && user.accountStatus === "ACTIVE" && (user.role === "SUPER_ADMIN" || user.email?.toLowerCase() === "nazmulha30@gmail.com");
}
export async function wpNazmulAccess() {
  const session=await auth();
  if(!session?.user || !(session.user.role === "SUPER_ADMIN" || session.user.email?.toLowerCase()==="nazmulha30@gmail.com"))return null;
  const user=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true,email:true,role:true,accountStatus:true}});
  return wpNazmulEligible(user)?user:null;
}
