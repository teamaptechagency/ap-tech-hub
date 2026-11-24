import type {ReactNode} from "react";
import {headers} from "next/headers";
import Script from "next/script";
import type {TrustStats} from "@/components/public/public-top-bar";
import type {LandingPageData} from "@/lib/landing-data";
export type BlogShellProps={children:ReactNode;portalHref?:string|null;publicLogoUrl?:string|null;copyright:string;compactFooter?:boolean;topBar:LandingPageData["topBar"];stats:TrustStats|null};
const PUBLIC="https://aptechagency.com";
export async function BlogShell({children,portalHref,copyright}:BlogShellProps){
 const host=(await headers()).get('host')?.split(':')[0];
 const publicSite=host==='aptechagency.com'||host==='www.aptechagency.com';
 return <main className="public-site min-h-screen w-full overflow-x-clip bg-[#fafbf7] font-sans text-[#24352b]">
  <header className="border-b border-[#dce4d5] bg-[#14261c] text-[#f5f7ee]"><div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-5"><a href={PUBLIC} className="flex items-center gap-3 text-lg font-semibold"><img src={PUBLIC+'/assets/ap-tech-symbol-light.png'} alt="" className="h-10 w-10 object-contain"/><span>AP Tech Agency</span></a><nav aria-label="Main navigation" className="flex flex-wrap items-center gap-5 text-sm">{[['/','Home'],['/services/','Services'],['/work/','Work'],['/about/','About'],['/blog','Blog']].map(([url,label])=><a key={url} href={PUBLIC+url} className="transition hover:text-[#bbd28b]">{label}</a>)}</nav><div className="flex items-center overflow-hidden rounded-full border border-[#60704d]"><a href={'https://manage.aptechagency.com'+(portalHref||'/login')} className="px-4 py-2.5 text-sm">Portal</a><a href={PUBLIC+'/contact/'} className="rounded-full bg-[#bdd18f] px-5 py-2.5 text-sm font-semibold text-[#14261c]">Let’s talk</a></div></div></header>
  {children}
  <footer className="mt-12 border-t border-[#dce4d5] bg-[#14261c] px-5 py-8 text-[#eaf0df]"><div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-5 text-sm"><p>{copyright}</p><nav className="flex flex-wrap gap-5"><a href={PUBLIC+'/privacy/'}>Privacy</a><a href="https://manage.aptechagency.com/partners/payment-policy">Referral partner policy</a><a href="https://manage.aptechagency.com/download">Download apps</a><a href={PUBLIC+'/contact/'}>Contact</a><a href="https://manage.aptechagency.com/login">Portal</a></nav></div></footer>
  {publicSite&&<><link rel="stylesheet" href={PUBLIC+'/assets/support.css'}/><link rel="stylesheet" href={PUBLIC+'/livechat-adapter.css?v=voice-visual-2'}/><div id="ap-support" className="ap-support" data-whatsapp="8801799664826"/><Script src={PUBLIC+'/assets/support.js'} strategy="afterInteractive"/><Script src={PUBLIC+'/livechat-voice.js?v=voice-visual-2'} strategy="afterInteractive"/></>}
 </main>;
}
