const steps = [
  {title:'Understand',text:'We learn about your business, customers and daily work, then turn your goals into a clear brief.',result:'Clear brief'},
  {title:'Shape the plan',text:'We set out the work, price and review stages before design and development begin.',result:'Proposal + fixed quote'},
  {title:'Build together',text:'See progress as we build. Share feedback at each review stage so we can keep the work on track.',result:'Review rounds'},
  {title:'Launch & hand over',text:'We check the key pages and workflows, prepare for launch and show your team how to use what we have built.',result:'Launch + handover'},
];
function ProcessIcon({index}) {
  const shapes=[<g key="compass"><circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/></g>,<g key="map"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16"/></g>,<g key="team"><circle cx="9" cy="8" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 5a3 3 0 0 1 0 6M18 14a6 6 0 0 1 4 5v2"/></g>,<g key="rocket"><path d="M14 5c2-2 5-3 7-2 1 2 0 5-2 7l-6 6-5-5ZM8 11l-4 1-2 4 6-1M13 16l-1 6 4-2 1-4M6 18l-3 3M15 7h.01"/></g>];
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[index]}</svg>;
}
export default function ApproachProcess(){return <section className="section approach-process" aria-labelledby="approach-process-title"><div className="wrap">
  <div className="section-head"><div><p className="eyebrow">How we work</p><h2 id="approach-process-title">A clear path from <em>idea to launch.</em></h2></div></div>
  <div className="approach-process-grid">{steps.map((step,index)=><article className="approach-process-card" key={step.title}>
    <div className="approach-process-top"><span className="approach-process-icon"><ProcessIcon index={index}/></span><span className="approach-process-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span></div>
    <h3>{step.title}</h3><p>{step.text}</p><span className="approach-process-result">You get: {step.result}</span>
  </article>)}</div>
  <div className="approach-process-footer"><strong>A clear plan. A fixed quote. Regular reviews.</strong><a className="button" href="/contact/">Start a project <span aria-hidden="true">→</span></a></div>
</div></section>;}
