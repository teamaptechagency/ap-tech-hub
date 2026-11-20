import Link from "next/link";

export default function ReferralResourcesPage() {
  return <div className="space-y-6">
    <div><h1>Partner resources</h1><p className="text-sm text-muted-foreground mt-2">Everything you need to introduce a client and understand your partner terms.</p></div>
    <div className="grid gap-5 md:grid-cols-3">
      {[
        { title: "Share your referral link", text: "Copy your personal link and introduce clients to AP Tech Agency.", href: "/r/link", action: "View my link" },
        { title: "Submit a client", text: "Record a new introduction so the team can review the project requirements.", href: "/r/submit", action: "Submit a referral" },
        { title: "Payment & commission policy", text: "Read the agreed commission models, payment arrangements and payout terms.", href: "/partners/payment-policy", action: "Read policy" },
      ].map(item => <section className="hub-job-panel p-6 space-y-4" key={item.href}><h2>{item.title}</h2><p className="text-sm text-muted-foreground">{item.text}</p><Link className="hub-details-link" href={item.href}>{item.action}</Link></section>)}
    </div>
  </div>;
}
