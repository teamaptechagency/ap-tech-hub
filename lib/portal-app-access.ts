import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, CLIENT_ROLES, PARTNER_ROLES, REFERRAL_ROLES } from "@/lib/roles";
export async function portalAppUser() {
 const session=await auth();if(!session?.user)return null;
 return prisma.user.findFirst({where:{id:session.user.id,accountStatus:"ACTIVE"},select:{id:true,name:true,role:true,clientId:true,partnerType:true,managedByPartnerId:true}});
}
export function appRole(role:string,partnerType?:string|null){if(ADMIN_ROLES.includes(role))return "CEO";if(CLIENT_ROLES.includes(role))return "CLIENT";if(REFERRAL_ROLES.includes(role)||role==="PARTNER_MANAGER"&&partnerType==="REFERENCE_PARTNER")return "REFERRAL";if(PARTNER_ROLES.includes(role))return "PARTNER";return "EMPLOYEE";}
export function appSurfaceAllowed(role:string,surface:string,partnerType?:string|null){const kind=appRole(role,partnerType);return surface==="client"?kind==="CLIENT":surface==="work"? ["EMPLOYEE","REFERRAL","PARTNER"].includes(kind):true;}
