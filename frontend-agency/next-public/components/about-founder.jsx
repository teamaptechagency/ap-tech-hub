export default function AboutFounder(){
 return <section className="section about-founder-section" aria-labelledby="about-founder-title"><div className="wrap about-founder-layout">
  <div className="about-founder-portrait" role="img" aria-label="Profile placeholder for Nazmul Hasan; portrait not yet supplied">
   <svg width="112" height="128" viewBox="0 0 112 128" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" aria-hidden="true"><circle cx="56" cy="36" r="23"/><path d="M10 115c0-28 21-46 46-46s46 18 46 46"/></svg>
   <div className="about-founder-name"><strong>Nazmul Hasan</strong><span>Founder &amp; Technical Lead</span></div>
  </div>
  <div className="about-founder-copy"><p className="eyebrow">Founder</p><h2 id="about-founder-title">About Nazmul Hasan</h2>
   <p className="lead">Nazmul leads the technical work. He brings experience in WordPress, Elementor, PHP and Laravel, turns business needs into practical build plans, and guides development and launch preparation.</p>
   <ul className="about-founder-skills" aria-label="Technical focus">{['WordPress','Elementor','PHP','Laravel','AI automation'].map(skill=><li key={skill}>{skill}</li>)}</ul>
  </div>
 </div></section>;
}
