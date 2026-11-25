import type {ReactNode} from "react";
import {headers} from "next/headers";
import Script from "next/script";
import type {TrustStats} from "@/components/public/public-top-bar";
import type {LandingPageData} from "@/lib/landing-data";
import {JournalNavigation} from "./journal-navigation";
import "./journal.css";
export type BlogShellProps={children:ReactNode;portalHref?:string|null;publicLogoUrl?:string|null;copyright:string;compactFooter?:boolean;topBar:LandingPageData["topBar"];stats:TrustStats|null};
const PUBLIC="https://aptechagency.com";
export async function BlogShell({children,copyright}:BlogShellProps){
 const host=(await headers()).get('host')?.split(':')[0];
 const publicSite=host==='aptechagency.com'||host==='www.aptechagency.com';
 return <div className="agency-insights">
  <link rel="stylesheet" href={PUBLIC+'/site.css'}/>
  <link rel="stylesheet" href={PUBLIC+'/assets/support.css'}/>
  <link rel="stylesheet" href={PUBLIC+'/livechat-adapter.css?v=realtime-voice-2'}/>
  <JournalNavigation/>
  <div className="plain-top"><div className="wrap masthead"><a className="brand-lockup" href={PUBLIC}><span className="brand-symbol"><img className="brand-day" src={PUBLIC+'/assets/ap-tech-symbol-dark.png'} alt=""/><img className="brand-night" src={PUBLIC+'/assets/ap-tech-symbol-light.png'} alt=""/></span><span className="brand-name">AP Tech <span>Agency</span></span></a><div className="masthead-note"><span>Connect. Automate. Grow.</span><a href={PUBLIC+'/contact/'}>Have a project in mind?</a></div></div></div>
  <main id="main">{children}</main>
  <footer className="footer"><div className="wrap"><div className="footer-top"><div className="footer-brand"><a href={PUBLIC} className="brand-lockup">AP Tech Agency</a><p>AI automation, websites and design that help your business work better.</p></div><nav className="footer-column" aria-label="Explore"><h2>Explore</h2>{[['/work/','Selected work'],['/reviews/','Client reviews'],['/about/','About us'],['/approach/','Our approach'],['/blog','Insights']].map(([url,label])=><a key={url} href={PUBLIC+url}>{label}</a>)}</nav><nav className="footer-column" aria-label="Contact"><h2>Start a conversation</h2><a href={PUBLIC+'/contact/'}>Start a project</a><a href="mailto:info@aptechagency.com">Email the team</a><a href="https://manage.aptechagency.com/login">Portal</a></nav><nav className="footer-column" aria-label="Information"><h2>Information</h2><a href={PUBLIC+'/privacy/'}>Privacy</a><a href="https://manage.aptechagency.com/partners/payment-policy">Partner policy</a></nav></div><div className="footer-bottom"><p>{copyright}</p><span>Based in Bangladesh. Working across borders.</span></div></div></footer>
  {publicSite&&<><Script src={PUBLIC+'/marketing.js?v=1'} strategy="afterInteractive"/><div id="ap-support" className="ap-support" data-whatsapp="8801799664826"/><Script src={PUBLIC+'/assets/support.js'} strategy="afterInteractive"/><Script src={PUBLIC+'/livechat-voice.js?v=realtime-voice-2'} strategy="afterInteractive"/></>}
 </div>;
}
