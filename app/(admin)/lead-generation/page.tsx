import {auth} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {LeadWorkspace} from '@/integrations/wpnazmul/ui/components/lead-workspace';
import '@/integrations/wpnazmul/ui/hub-styles.css';
export default async function Page(){
 const session=await auth();if(!session?.user||!['SUPER_ADMIN','ADMIN'].includes(session.user.role))redirect('/dashboard');
 return <div className="wpnazmul-surface aptech-lead-generation"><p className="mb-4 text-sm text-muted-foreground">AP Tech · Lead Generation · <a href="/leads" className="underline">Open existing CRM</a></p><LeadWorkspace site="aptech"/></div>;
}
