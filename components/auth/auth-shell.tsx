import type { ReactNode } from "react";
import { ArrowRight, Check, Layers3, ShieldCheck, Users } from "lucide-react";
import { HubAppearance } from "@/components/layout/hub-appearance";
import type { BrandingSettings } from "@/lib/branding";

export function AuthShell({ children, branding }: { children: ReactNode; branding: BrandingSettings }) {
  const mark = branding.hubLogoUrl === "/brand/mark.png" ? "/brand/mark-dark.png" : branding.hubLogoUrl || "/brand/mark-dark.png";
  return <main className="auth-redesign">
    <section className="auth-brand-panel" aria-label="AP Tech Agency Hub">
      <div className="auth-brand-mesh" aria-hidden="true" />
      <a className="auth-brand" href="https://aptechagency.com"><img src={mark} width={50} height={38} alt="" /><span><strong>AP TECH <span>AGENCY</span></strong><small>ONE WORKSPACE</small></span></a>
      <div className="auth-brand-story"><p className="auth-eyebrow"><span />YOUR WORK, CONNECTED</p><h2>Good work.<br />Great people.<br /><span>One workspace.</span></h2><p className="auth-brand-description">A little less back-and-forth.<br />A lot more moving forward.</p>
        <div className="auth-workflow" aria-label="Project workflow illustration"><p className="auth-workflow-caption">THE BIG PICTURE, AT A GLANCE <span>YOUR WORKFLOW</span></p><div className="auth-project-card"><div className="auth-project-heading"><span className="auth-project-icon"><Layers3 size={21} /></span><div><strong>From idea to delivery</strong><small>A shared vision. A clear next step.</small></div><span aria-hidden="true">···</span></div><ol className="auth-milestones"><li className="complete"><span><Check size={13} /></span>Plan</li><li className="current"><span />Design</li><li><span />Build</li><li><span />Launch</li></ol><div className="auth-project-footer"><span>Clear progress, at every step</span><ArrowRight size={15} /></div></div><div className="auth-feedback"><span><Check size={17} /></span><div>Everyone on the same page.<small>Feedback, files and progress — together.</small></div></div></div>
      </div>
      <div className="auth-brand-bottom"><span><Users size={17} /><ShieldCheck size={17} /></span><p>Made for working together.<small>Admins · Employees · Clients · Partners</small></p></div>
    </section>
    <section className="auth-form-panel" aria-label="Access your workspace"><div className="auth-form-topbar"><a href="https://aptechagency.com">Back to website <ArrowRight size={13} /></a><HubAppearance /></div><div className="auth-form-content">{children}</div><footer className="auth-form-footer"><span>© {new Date().getFullYear()} AP Tech Agency</span><a href="https://aptechagency.com/contact/">Need help?</a></footer></section>
  </main>;
}
