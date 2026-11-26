function ServiceIcon({website=false}){
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{website?<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}</svg>;
}
export default function AboutHero(){
 return <section className="page-hero about-page-hero"><div className="wrap about-hero-layout">
  <div className="about-hero-copy"><p className="eyebrow">About AP Tech</p>
   <h1>AI automation, with a team <em>behind every step.</em></h1>
   <p className="lead">We help businesses turn customer conversations into useful next steps. AI automation leads the way, supported by website development and UI/UX design.</p>
   <div className="button-row"><a className="button" href="/contact/">Start a project <span aria-hidden="true">→</span></a><a className="button outline" href="/approach/">Our approach</a></div>
  </div>
  <div className="about-hero-summary">
   <div className="about-team-card"><strong className="about-team-count">5</strong><p>people, one shared plan — working from Bangladesh, across borders.</p></div>
   <div className="about-service-cards">
    <a href="/services/ai-automation/" className="about-service-card"><span className="about-service-icon"><ServiceIcon/></span><strong>AI automation</strong></a>
    <a href="/services/website-development/" className="about-service-card"><span className="about-service-icon"><ServiceIcon website/></span><strong>Websites &amp; design</strong></a>
   </div>
  </div>
 </div></section>;
}
