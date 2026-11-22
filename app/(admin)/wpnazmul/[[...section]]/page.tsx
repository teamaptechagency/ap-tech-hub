import { redirect, notFound } from "next/navigation";
import { wpNazmulAccess } from "@/lib/wpnazmul-access";
import { AdminWorkspace } from "@/integrations/wpnazmul/ui/components/admin-workspace";
import "@/integrations/wpnazmul/ui/hub-styles.css";
export default async function WpNazmulPage({params,searchParams}:{params:Promise<{section?:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  if(!await wpNazmulAccess())notFound();
  const {section=[]}=await params;const query=await searchParams;
  const view=section[0]||'overview';
  if(view==='integrations')redirect('/integrations-config?tab=wpnazmul');
  if(!['overview','orders','messages','leads','clients','files','invoices','services','settings','integrations'].includes(view)||section.length>2)notFound();
  return <AdminWorkspace key={section.join('/')+JSON.stringify(query)} view={view} order={section[1]} showNew={query.new==='1'} clientFilter={query.client} messageProject={query.project} inboxTab={typeof query.tab==='string'?query.tab:undefined} publishedProfile={{}}/>;
}
