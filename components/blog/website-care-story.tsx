import { FileText, RefreshCw, Shield, Star, Wrench } from "lucide-react";

// Presentation of the owner-reviewed article, only used while its source
// fingerprint matches. Subsequent editor changes render their own content.
export const careStorySlug = "why-frequent-website-care-prevents-costly-business-interruptions-2026-11-26";
export const careStoryFingerprint = "868703a95c344c5ffe3ccc759ca40f24a0fe434a1a3f3d4841173df46d2fb0b9";
export const careStoryHeadings = [
  {id:"recognizing-the-signs-of-website-neglect",text:"Recognising the signs of neglect"},
  {id:"common-causes-behind-website-problems",text:"Common causes of problems"},
  {id:"trade-offs-in-website-care-strategies",text:"Trade-offs in website care"},
  {id:"business-impact-of-inadequate-website-maintenance",text:"The business impact"},
  {id:"planning-for-sustainable-website-health",text:"Planning for website health"},
  {id:"conclusion",text:"Conclusion"},
];
export function CareCover(){return <div className="insight-care-cover" aria-label="Website care: security and maintenance" role="img"><span><Shield/></span><span><Wrench/></span></div>;}
export function WebsiteCareStory(){return <div className="insight-prose insight-care-story">
  <section aria-labelledby={careStoryHeadings[0].id}><h2 id={careStoryHeadings[0].id}>Recognising the signs of website neglect</h2><p>Owners usually notice problems only after customers report them. The signs start small, then get worse quickly:</p><ul className="insight-symptoms">{['Slow pages','Broken links','Checkout errors','Frequent downtime','Outdated-software prompts','Falling search rankings'].map(text=><li key={text}>{text}</li>)}</ul></section>
  <section aria-labelledby={careStoryHeadings[1].id}><h2 id={careStoryHeadings[1].id}>Common causes behind website problems</h2><p>Site health declines for three main reasons:</p><div className="insight-cause-grid">{[
    {Icon:RefreshCw,title:'Ageing or incompatible software',text:'Skipped WordPress core and plugin updates lead to conflicts and broken features.'},
    {Icon:Shield,title:'Security weaknesses',text:'Out-of-date code is an open door for hacking.'},
    {Icon:FileText,title:'Weak backup practices',text:'Without reliable backups, recovery after a failure takes longer and costs more.'},
  ].map(({Icon,title,text})=><div className="insight-cause" key={title}><span className="insight-icon"><Icon aria-hidden="true"/></span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
  <section aria-labelledby={careStoryHeadings[2].id}><h2 id={careStoryHeadings[2].id}>Trade-offs in website care strategies</h2><p>Every business weighs ongoing maintenance against new projects and marketing. Poorly prioritised updates can even slow a site down.</p><div className="insight-tradeoffs"><div><p className="journal-eyebrow">Cut upkeep</p><h3>Saves money — briefly</h3><p>Outages or breaches lead to expensive emergency repairs and lost opportunities.</p></div><div><p className="journal-eyebrow">Plan upkeep</p><h3>Steady, predictable cost</h3><p>Prioritised updates protect performance without draining budget from new projects.</p></div></div><blockquote>Regular website care is often overlooked until a problem disrupts business operations.</blockquote></section>
  <section aria-labelledby={careStoryHeadings[3].id}><h2 id={careStoryHeadings[3].id}>Business impact of inadequate maintenance</h2><dl className="insight-impact">{[['Trust','Visitors lose confidence in a slow or broken site.'],['Conversions','Bounce rates rise and fewer visitors buy or enquire.'],['Search','Slow or insecure sites can lose search visibility and organic traffic.'],['Support','Unresolved issues add load on your team.']].map(([term,text])=><div key={term}><dt>{term}</dt><dd>{text}</dd></div>)}</dl><p>Over time, neglect weakens competitiveness and stalls growth.</p></section>
  <section aria-labelledby={careStoryHeadings[4].id}><h2 id={careStoryHeadings[4].id}>Planning for sustainable website health</h2><p>A simple routine reduces most of the risk:</p><ol className="insight-numbered">{['Scheduled updates','Regular backups','Performance monitoring','Regular review of priorities against resources, site complexity and how critical uptime is'].map(text=><li key={text}>{text}</li>)}</ol></section>
  <section aria-labelledby="conclusion"><h2 id="conclusion">Conclusion</h2><p>Website upkeep is an ongoing challenge that affects customer satisfaction and operational stability. Catch the symptoms early and plan maintenance, and you avoid costly interruptions.</p><aside className="insight-takeaways"><h3><span className="insight-icon"><Star aria-hidden="true"/></span>Key takeaways</h3><ul>{['Small symptoms — slow pages, broken links — signal bigger risks','Skipping updates and backups makes failures costlier to fix','Scheduled updates, backups and monitoring keep the site steady'].map(text=><li key={text}><span aria-hidden="true">✓</span>{text}</li>)}</ul></aside></section>
</div>;}

