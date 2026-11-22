'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ActionLink, assets, Icon, Logo, publicHref } from './elements';
const publicOnly = process.env.NEXT_PUBLIC_WPN_PUBLIC_ONLY === '1';
const featuredServices = [
  { title: 'Software Planning', icon: 'flag', copy: 'Turn an idea into a build plan with requirements, sitemaps, user flows, system architecture, and a roadmap for the first release.' },
  { title: 'WordPress Website Development', icon: 'globe', copy: 'Custom WordPress and Elementor websites, WooCommerce stores, theme and plugin development, redesigns, migrations, speed optimization, and ongoing maintenance.' },
  { title: 'Full-Stack Development', icon: 'code', copy: 'Interactive frontends, backend APIs, client portals, dashboards, and integrations built with PHP, Laravel, Node.js, React, and Next.js.' },
  { title: 'Database Design', icon: 'layout', copy: 'Design clean schemas, relationships, indexes, and migrations for reliable reporting and growth. Work with MySQL, SQLite, MongoDB, and PostgreSQL.' },
];

export function PublicHeader() {
  return <nav className="public-dock" aria-label="Main navigation">
    <Link className="public-dock-brand public-dock-wordmark" href={publicHref+'#page-top'} aria-label="Nazmul H. — Homepage top">Nazmul H.</Link>
    <div className="public-dock-links">
      {[['services','Services'],['work','Selected work'],['reviews','Reviews'],['about','About me'],['contact','Contact']].map(([id,label]) =>
        <Link key={id} href={publicHref + '#' + id}>{label}</Link>)}
      {!publicOnly && <Link className="public-dock-portal" href="/client"><Icon name="user" size={16} />Client portal</Link>}
      <Link className="public-dock-admin btn btn-dark" href="/wpnazmul">Portal</Link>
      <button type="button" className="public-dock-top" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })} aria-label="Back to top">↑ Top</button>
    </div>
  </nav>;
}

export function PublicFooter() {
  return <footer className="site-footer"><div className="container">
    <p className="footer-thanks">Thank You</p>
    <p className="footer-bottom footer-copyright">© 2026 Nazmul Hasan. Built with care.</p>
  </div></footer>;
}

export function VisualDialog({ dialogRef, title, children, className = '', onClose, footer }) {
  return <dialog ref={dialogRef} className={'preview-dialog ' + className} aria-label={title} onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
    <div><header className="modal-header"><h2>{title}</h2><button type="button" className="icon-btn" aria-label="Close dialog" onClick={() => dialogRef.current?.close()}><Icon name="close" /></button></header>
      <div className="modal-body">{children}</div>{footer&&<div className="modal-footer">{footer}</div>}
    </div>
  </dialog>;
}

import { VoiceAssistant as AssistantPreview } from './voice-assistant';
export { AssistantPreview };

function Reviews({ reviews }) {
  const list = useRef(null);
  const [first, setFirst] = useState(0);
  const [visible, setVisible] = useState(3);
  const total = reviews.length;
  function move(index) {
    const track = list.current;
    const card = track?.children[Math.max(0, Math.min(total - visible, index))];
    if (card) track.scrollTo({ left: card.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  useEffect(() => {
    const track = list.current;
    if(!track)return;
    const update = () => {
      const card = track.firstElementChild;
      const cols = Math.round((track.clientWidth + 20) / (card.getBoundingClientRect().width + 20));
      setVisible(Math.max(1, Math.min(3, cols)));
      setFirst(Math.round(track.scrollLeft / (card.getBoundingClientRect().width + Number.parseFloat(getComputedStyle(track).columnGap))));
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener('scroll', update, { passive:true });
    update();
    return () => { observer.disconnect(); track.removeEventListener('scroll', update); };
  }, [total]);
  const pages = Math.ceil(total / visible);
  return <section className="section reviews-section" id="reviews"><div className="container">
    <div className="section-head reviews-heading"><div><h2>What clients say</h2></div>
      <p>Feedback on my work and projects delivered with the AP Tech Agency team.</p></div>
    {!total?<p>No client reviews are currently published.</p>:<>
    <div className="reviews-track preview-reviews" aria-label="Client reviews" role="region" ref={list} tabIndex={0} onKeyDown={event => {
      const to = { ArrowLeft:first-visible, ArrowRight:first+visible, Home:0, End:total-visible }[event.key];
      if (to !== undefined) { event.preventDefault(); move(to); }
    }}>
      {reviews.map(item=><article className="review-card" key={item.slug}>
        <div className="review-card-top">{item.rating!==undefined&&<><span className="review-stars" aria-hidden="true">{'★'.repeat(Math.floor(item.rating))}{'☆'.repeat(5-Math.floor(item.rating))}</span><span className="review-score">{item.rating} / 5</span></>}<span className="review-quote-mark" aria-hidden="true">“</span></div>
        {item.service&&<p className="review-service">{item.service}</p>}<blockquote>{item.quote}</blockquote>
        <div className="review-author"><span className="avatar" aria-hidden="true">{item.author?.slice(0,1)}</span><div><strong>{item.author}</strong>{item.location&&<span>{item.location}</span>}</div></div>
      </article>)}
    </div>
    {pages>1&&<div className="reviews-controls"><p className="reviews-counter" role="status">Showing {first+1}–{Math.min(total,first+visible)} of {total}</p>
      <div className="reviews-pagination">{Array.from({ length:pages },(_,index) => <button type="button" className={Math.floor(first/visible) === index ? 'active' : ''} key={index} onClick={() => move(index*visible)} aria-label={'Review page '+(index+1)}><span /></button>)}</div>
      <div className="reviews-buttons"><button type="button" className="btn btn-outline" disabled={first === 0} onClick={() => move(first-visible)}>Previous</button><button type="button" className="btn btn-dark" disabled={first+visible >= total} onClick={() => move(first+visible)}>Next</button></div>
    </div>}</>}
  </div></section>;
}

export function PublicPreview({ projects:work, services, reviews, profile, onlyCatalog=false }) {
  const [filter, setFilter] = useState('all');
  const [visibleCount,setVisibleCount] = useState(2);
  const filteredItems = work.filter(item => filter === 'all' || item.filter === filter);
  const items = onlyCatalog ? filteredItems : filteredItems.slice(0, visibleCount);
  return <><PublicHeader /><main id="main" className="page-fade">
    {!onlyCatalog && <><section className="hero hero-cinematic"><div className="hero-atmosphere" aria-hidden="true"><span/><span/><span/></div><div className="container hero-layout"><div className="hero-copy">
      <div className="available"><span className="dot" />{profile.availability || "Available for project enquiries"}</div>
      <div className="eyebrow">Hey, I’m {profile.name}</div><h1 className="hero-editorial">From first sketch <em>to final deploy.</em></h1>
      <p>I build WordPress websites, develop full-stack web applications, and design the databases behind them.</p>
      <div className="hero-actions"><ActionLink href="/#services">Explore services <Icon name="arrow" /></ActionLink><a className="btn btn-ghost" href="#work">See selected work</a></div>
      <div className="hero-proof"><Icon name="globe" />Based in Bangladesh. Building for the world.</div>
    </div><div className="hero-visual"><div className="portrait-stage">
      <img src={assets+'nazmul-portrait.webp'} alt="Nazmul Hasan, WordPress developer and project planner" width={1039} height={1001} fetchPriority="high" />
      <div className="portrait-label"><span><Icon name="code" /></span><div><strong>Web development & database design</strong><small>WordPress · Laravel · Next.js · MySQL</small></div></div>
      <div className="portrait-sticker"><span>A LITTLE CODE.</span><Icon name="spark" /><span>A LOT OF CARE.</span></div>
      <span className="portrait-caption">Let’s make something good together.</span>
    </div></div></div></section>
    <div className="container"><div className="hero-tech"><div className="tech-caption">The right tools.<br />A stronger foundation.</div><div className="tech-names">
      {[['W','WordPress'],['╱╱','Laravel'],['N','Next.js'],['◇','Figma'],['✧','OpenAI']].map(([mark,name]) => <span key={name}><span className="tech-symbol">{mark}</span>{name}</span>)}
    </div></div></div>
    </>}
    {!onlyCatalog && (
    <section className="section dark-section" id="services"><div className="container services-layout">
      <div className="services-intro"><div className="eyebrow">Services</div><h2>Built for your business.<br />Ready to grow.</h2>
        <p>Launch a WordPress site, build a custom web app, or design the database behind it. I can help from planning through launch.</p><AssistantPreview externalButton /></div>
      <div className="service-grid">{featuredServices.map(item => <article className="service-card" key={item.title}>
        <span className="service-icon"><Icon name={item.icon} size={28}/></span><h3>{item.title}</h3><p>{item.copy}</p>
      </article>)}</div></div>

      {services.length>0&&<details className="container visual-service-catalog"><summary>View all published services</summary><ul>{services.map(item=><li key={item.slug}><Link href={'/service/'+encodeURIComponent(item.slug)}>{item.title}</Link></li>)}</ul></details>}
    </section>
    )}
    <section className="section" id="work"><div className="container"><div className="section-head"><div>
      <h2>Selected projects</h2><p>Explore WordPress sites and custom web applications I’ve worked on.</p></div>
      <div className="filter-tabs" role="group" aria-label="Filter selected work">{[['all','All work'],['wordpress','WordPress'],['custom','Custom builds']].map(([id,label]) =>
        <button key={id} type="button" className={id === filter ? 'active' : ''} aria-pressed={id === filter} onClick={() => { if (id !== filter) { setFilter(id); setVisibleCount(2); } }}>{label}</button>)}</div></div>
      <div className="work-grid">{items.map(item=>{
        const body=<><div className="work-image">{item.cover?<img src={item.cover} alt={item.title+' website project'} width={1421} height={800}/>:<span className="work-cover-unavailable">No cover available</span>}{item.outbound&&<span className="work-view">Visit website</span>}</div>
          <div className="work-meta"><div><h3>{item.title}</h3><p>{item.tag}</p></div>{item.outbound&&<Icon name="external"/>}</div></>;
        return item.outbound?<a key={item.slug} className="work-card" href={item.outbound} target="_blank" rel="noopener noreferrer" aria-label={'Visit '+item.title+' website (opens in a new tab)'}>{body}</a>:
          <article key={item.slug} className="work-card">{body}</article>;
      })}</div>
      {!items.length&&<p role="status">No published projects match this filter.</p>}
      {!onlyCatalog&&<div className="work-footer">{visibleCount<filteredItems.length&&<button className="btn btn-outline" type="button" onClick={()=>setVisibleCount(count=>Math.min(count+2,filteredItems.length))}>A little more of my work <Icon name="plus"/></button>} <ActionLink href="/projects" className="link-btn">View the full catalog</ActionLink></div>}
    </div></section>
    {!onlyCatalog && <><Reviews reviews={reviews} />
    <section className="section"><div className="container"><div className="section-head"><div><h2>How we’ll work together</h2></div></div>
      <div className="process-grid">{[['chat','Define the project','We’ll agree on what you need, how success will be measured, and what belongs in the first release.'],['layout','Choose the right setup','I’ll map the pages, workflows, or data model and explain the platform choices before development starts.'],['flag','Test, launch, and hand over','We’ll review the work, test the main user flows, and go through what you need to run it after launch.']].map(([icon,title,copy]) => <div className="process-item" key={title}><div className="process-icon"><Icon name={icon} /></div><h3>{title}</h3><p>{copy}</p></div>)}</div>
    </div></section>
    {!publicOnly && <section className="container"><div className="workspace-promo"><div><div className="eyebrow">A little less back-and-forth</div><h2>Your project.<br />All in one place.</h2><p>Messages, milestones, files, and feedback. A simple workspace that keeps us on the same page.</p><ActionLink href="/client">Explore the client workspace <Icon name="grid" /></ActionLink></div>
      <div className="mini-workspace"><div className="mini-top between"><span>▦ Your workspace</span><span className="pill pill-green">Design preview</span></div><div className="mini-project"><h4>Your next great website</h4><p className="small muted">Bringing it to life</p><div className="progress"><span style={{width:'80%'}} /></div></div></div></div></section>}
    <section id="about" className="section"><div className="container about-layout"><div className="about-label"><h2>A developer.<br />A planner.<br />Your partner.</h2><p className="small" style={{color:"#aec4b6"}}>Nazmul Hasan · Since 2018</p><div className="stat-row"><div><strong>8+</strong><p>Years of experience</p></div><div><strong>100+</strong><p>Independent projects</p></div></div></div>
      <div className="about-copy"><h2>About Nazmul Hasan</h2><p>I’m a web developer and software project planner based in Bangladesh. I work with businesses and teams across the US, UK, Europe, and beyond.</p><p>I help businesses choose a platform, plan the user experience, and decide how their data should be organized. Then I build the WordPress site, web application, or database the project calls for.</p><div className="tags">{['WordPress & WooCommerce','PHP & Laravel','Node.js & Next.js','Database design'].map(tag => <span className="pill" key={tag}>{tag}</span>)}</div></div>
    </div></section>
        <section className="section" id="faq" style={{paddingTop:0}}><div className="container faq-layout"><div><div className="eyebrow">Before we say hello</div><h2>A few good questions.</h2><p>Something else on your mind?</p><ActionLink href="/request" className="link-btn">Start a project</ActionLink></div><div>
      {[
        ['What does a website cost?','Small, clearly scoped WordPress and Elementor projects start from $100. The final price depends on the pages, content, features, and timeline.'],
        ['Can you work with my existing website?','Yes. I help with redesigns, speed improvements, bug fixes, migrations, and new features.'],
        ['Do I need WordPress or a custom app?','WordPress is a good fit for content-heavy sites and many online stores. If you need custom roles, workflows, or integrations, we can look at a full-stack application.'],
        ['Can you help with an existing database?','Yes. We can review the schema, relationships, queries, and migration needs before deciding what to change.'],
        ['Do you work with agencies and remote teams?','Yes. I work on direct projects, agency partnerships, and remote contracts.'],
      ].map(([question,answer]) => <details className="faq-item" key={question}><summary>{question}<Icon name="plus" /></summary><p>{answer}</p></details>)}
    </div></div></section>
    <section id="contact" className="contact-section"><div className="container between"><div><h2>Tell me about<br />your project.</h2><p>Share what you want to build, what you already have, and when you need it.</p><div className="contact-actions">{publicOnly ? <a className="btn btn-dark" href="mailto:hello@wpnazmul.com">Email hello@wpnazmul.com <Icon name="chat"/></a> : <><ActionLink href="/request">Start a project <Icon name="plus" /></ActionLink><ActionLink href="/request" className="btn btn-outline">Let’s talk <Icon name="chat" /></ActionLink></>}</div></div><span className="contact-decoration"><Icon name="spark" size={44} /></span></div></section>
  </>}</main><PublicFooter /></>;
}
