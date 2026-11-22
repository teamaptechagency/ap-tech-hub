"use client";
import { useState } from "react";
import { Mail, Sparkles, Plug } from "lucide-react";
import { WebsiteMail } from "@/components/chat/website-mail";
import { AiMessagingSettings } from "./ai-messaging-settings";
import { Integrations } from "@/integrations/wpnazmul/ui/components/admin-workspace";

export function IntegrationConfig({canAccessWp,initialTab}:{canAccessWp:boolean;initialTab:string}) {
  const tabs = [{key:"mail",label:"Email & OTP",icon:Mail,description:"Mailbox, reset links and notifications"},
    {key:"ai",label:"Aptee AI",icon:Sparkles,description:"AI messaging, sales rules and alerts"},
    ...(canAccessWp?[{key:"wpnazmul",label:"WP Nazmul",icon:Plug,description:"AI, email, SMS and provider connections"}]:[])];
  const [tab,setTab]=useState(tabs.some(t=>t.key===initialTab)?initialTab:"mail");
  return <div className="space-y-6"><header><h1 className="text-2xl font-bold">Integration &amp; Config</h1><p className="mt-1 text-sm text-muted-foreground">Manage your connected services and their configuration in one place.</p></header>
    <nav aria-label="Integration categories" className="grid gap-3 md:grid-cols-3">{tabs.map(t=><button type="button" key={t.key} aria-pressed={tab===t.key} onClick={()=>{setTab(t.key);window.history.replaceState(null,"","?tab="+t.key);}} className={`rounded-xl border p-4 text-left transition-colors ${tab===t.key?"border-primary bg-primary/10":"bg-card hover:bg-muted/40"}`}><t.icon className="mb-3 h-5 w-5" aria-hidden="true"/><strong>{t.label}</strong><p className="mt-1 text-sm text-muted-foreground">{t.description}</p></button>)}</nav>
    {tab==="mail"&&<WebsiteMail setupOnly/>}{tab==="ai"&&<AiMessagingSettings/>}{tab==="wpnazmul"&&canAccessWp&&<div className="wpnazmul-surface"><Integrations publishedProfile={{}}/></div>}
  </div>;
}
