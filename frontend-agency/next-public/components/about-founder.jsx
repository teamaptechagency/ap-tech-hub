export default function AboutFounder(){
 return <section className="section about-founder-section" aria-labelledby="about-founder-title"><div className="wrap about-founder-layout">
  <div className="about-founder-portrait">
   <img src="/assets/nazmul-portrait.webp" alt="Nazmul Hasan, Founder and Technical Lead at AP Tech Agency" width="1039" height="1001" loading="lazy"/>
   <div className="about-founder-name"><strong>Nazmul Hasan</strong><span>Founder &amp; Technical Lead</span></div>
  </div>
  <div className="about-founder-copy"><p className="eyebrow">Founder</p><h2 id="about-founder-title">About Nazmul Hasan</h2>
   <p className="lead">Nazmul leads the technical work. He brings experience in WordPress, Elementor, PHP and Laravel, turns business needs into practical build plans, and guides development and launch preparation.</p>
   <ul className="about-founder-skills" aria-label="Technical focus">{['WordPress','Elementor','PHP','Laravel','AI automation'].map(skill=><li key={skill}>{skill}</li>)}</ul>
  </div>
 </div></section>;
}
