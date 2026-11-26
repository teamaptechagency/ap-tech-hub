import principles from '../app/about/principles.json';
function DecisionIcon({index}){
 const paths=[<path key="heart" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,<g key="file"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></g>,<g key="target"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></g>,<g key="key"><circle cx="8" cy="16" r="5"/><path d="m11.5 12.5 9-9M17 7l3 3M19 5l2 2"/></g>];
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[index]}</svg>;
}
export default function AboutDecisions(){return <section className="section about-decisions" aria-labelledby="about-decisions-title"><div className="wrap">
 <div className="section-head"><div><p className="eyebrow">How we decide</p><h2 id="about-decisions-title">Good work starts<br/><em>with good decisions.</em></h2></div></div>
 <div className="about-decision-grid">{principles.map((item,index)=><article className="about-decision-card" key={item.title}><span className="about-decision-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span className="about-decision-icon"><DecisionIcon index={index}/></span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
 </div></section>;}
