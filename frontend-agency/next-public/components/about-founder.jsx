export default function AboutFounder(){
 return <section className="section about-founder-section" aria-labelledby="about-founder-title"><div className="wrap about-founder-layout">
  <div className="about-founder-portrait">
   <img src="/assets/nazmul-portrait.webp" alt="Nazmul Hasan, Founder and Technical Lead at AP Tech Agency" width="1039" height="1001" loading="lazy"/>
   <div className="about-founder-name"><strong>Nazmul Hasan</strong><span>Founder &amp; Technical Lead</span></div>
  </div>
  <div className="about-founder-copy"><p className="eyebrow">Founder</p><h2 id="about-founder-title">About Nazmul Hasan</h2>
   <p className="lead">Nazmul leads the technical work. He brings experience in WordPress, Elementor, PHP and Laravel, turns business needs into practical build plans, and guides development and launch preparation.</p>
   <ul className="about-founder-skills" aria-label="Technical focus">{['WordPress','Elementor','PHP','Laravel','AI automation'].map(skill=><li key={skill}>{skill}</li>)}</ul>
   <div className="button-row"><a className="button founder-website-button" href="https://wpnazmul.com/" target="_blank" rel="noopener noreferrer" aria-label="Visit Nazmul Hasan’s website (opens in a new tab)"><svg className="founder-website-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z"/></svg><span>Visit my website</span><span className="founder-website-arrow" aria-hidden="true">↗</span></a></div>
  </div>
 </div></section>;
}
