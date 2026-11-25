import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {MarketingSettings} from "@/components/settings/marketing-settings";
export default async function MarketingPage(){
 const session=await auth();
 if(session?.user?.role!=="SUPER_ADMIN")redirect('/dashboard');
 return <div className="space-y-6"><header><h1 className="text-2xl font-bold">Marketing</h1><p className="mt-2 text-muted-foreground">AP Tech website analytics, SEO and advertising measurement.</p></header><MarketingSettings/><section className="max-w-2xl space-y-3 rounded-xl border bg-card p-6"><h2 className="font-semibold">SEO &amp; publishing</h2><p className="text-sm text-muted-foreground">Daily AI publishing is scheduled for 8:00 PM Bangladesh time. Articles explain service-related problems and business impact. Manage instructions and thumbnails in Blog → AI configuration.</p><div className="flex flex-wrap gap-4 text-sm"><a className="underline" href="/blog-manager">Blog &amp; AI configuration</a><a className="underline" href="https://aptechagency.com/sitemap.xml" target="_blank" rel="noreferrer">Website sitemap ↗</a><a className="underline" href="https://aptechagency.com/blog/sitemap.xml" target="_blank" rel="noreferrer">Article sitemap ↗</a></div><p className="text-sm text-muted-foreground">Use your own Google Analytics and Meta Events Manager accounts. Add IDs above, verify events in those accounts, and approve budget before launching an ad campaign. No paid campaigns are launched here.</p></section></div>;
}
