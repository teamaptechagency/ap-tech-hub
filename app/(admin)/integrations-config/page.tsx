import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { wpNazmulAccess } from "@/lib/wpnazmul-access";
import { IntegrationConfig } from "@/components/settings/integration-config";
import "@/integrations/wpnazmul/ui/hub-styles.css";

export default async function IntegrationsPage({searchParams}:{searchParams:Promise<{tab?:string}>}) {
  const session=await auth();
  if(!session?.user||!["SUPER_ADMIN","ADMIN"].includes(session.user.role))redirect("/dashboard");
  const query=await searchParams;
  return <IntegrationConfig canAccessWp={Boolean(await wpNazmulAccess())} initialTab={query.tab||"mail"}/>;
}
