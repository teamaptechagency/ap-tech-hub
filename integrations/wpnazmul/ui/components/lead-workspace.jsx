'use client';

import { useEffect, useRef, useState } from 'react';
import { Archive, BookmarkPlus, Check, Sparkles, Trash2, CalendarDays, Eye, Folder, LayoutGrid, Mail, Search, Target, Users } from 'lucide-react';
import { LeadDetails } from './lead-details';
import { LeadTools, leadStages, exportLeads } from './lead-crm';
import { workspace } from '../lib/workspace-client';

const leadOptions = {
  keywords: ['WordPress development partner', 'White-label web development', 'Website redesign', 'WooCommerce store', 'Website speed optimization', 'Laravel or Next.js developer', 'Client portal or dashboard'],
  countries: ['United States', 'United Kingdom', 'Europe (multiple countries)', 'US, UK and Europe', 'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland'],
  industries: ['Web design and digital agencies', 'Ecommerce businesses', 'Professional services', 'Training and education providers', 'Hospitality and tourism businesses'],
  services: ['WordPress development', 'WooCommerce development', 'Website redesign and maintenance', 'Full-stack development', 'Database design', 'Software planning'],
};

export function LeadWorkspace() {
  const [leads, setLeads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('Discover');
  const [keywords, setKeywords] = useState('');
  const [country, setCountry] = useState('');
  const [business, setBusiness] = useState('');
  const [service, setService] = useState('');
  const [businessAge,setBusinessAge]=useState('any');
  const [cooldown,setCooldown]=useState(0);
  const [removeTarget,setRemoveTarget]=useState(null);
  const removeDialog=useRef(null);
  useEffect(()=>{if(removeTarget&&!removeDialog.current.open)removeDialog.current.showModal();if(!removeTarget&&removeDialog.current?.open)removeDialog.current.close();},[removeTarget]);
  useEffect(()=>{if(cooldown<=0)return;const t=setTimeout(()=>setCooldown(cooldown-1),1000);return()=>clearTimeout(t);},[cooldown]);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState(null);
  const [savedFilter, setSavedFilter] = useState('');
  const [role, setRole] = useState('');
  const [savedSearches, setSavedSearches] = useState([]);
  const [followView, setFollowView] = useState('Open');
  const [lastQuery, setLastQuery] = useState('');
  const [detailId, setDetailId] = useState(null);
  const query = [keywords.trim(), country.trim() && 'Country: ' + country.trim(), role.trim() && 'Contact role: ' + role.trim(), business.trim() && 'Business type: ' + business.trim(), service && 'Service: ' + service, businessAge!=='any'&&'New business launch age: '+businessAge+' months; require dated launch evidence'].filter(Boolean).join('. ');
  const isNext = Boolean(query && query === lastQuery);
  const detail = leads.find(lead => lead.id === detailId);
  const [selected, setSelected] = useState(null);
  const review = useRef(null);
  const [draftTone,setDraftTone]=useState('friendly');
  const [generating,setGenerating]=useState(false);
  async function generateDraft(){
    const form=review.current?.querySelector('form');
    if(!selected||!form||busy||generating)return;

    setGenerating(true);setBusy(true);setReviewError('');
    try{
      const result=await api('/'+selected.id+'/generate-draft','POST',{tone:draftTone});
      if(form.isConnected){form.elements.subject.value=result.subject;form.elements.body.value=result.body;}
    }catch(problem){setReviewError(problem.message);}finally{setGenerating(false);setBusy(false);}
  }
  const [invite,setInvite]=useState(null);
  useEffect(()=>{
    setInvite(null);
    if(!selected)return;
    let current=true;
    api('/'+selected.id+'/invite','POST',{}).then(result=>{if(current)setInvite(result);})
      .catch(problem=>{if(current)setReviewError(problem.message);});
    return()=>{current=false;};
  },[selected]);
  const [reviewError, setReviewError] = useState('');
  useEffect(() => {
    const dialog = review.current;
    if (selected && dialog && !dialog.open) dialog.showModal();
    if (!selected && dialog?.open) dialog.close();
  }, [selected]);
  const api = (path = '', method, body) => workspace('admin', '/leads' + path, method, body);
  useEffect(() => {
    api().then(data => { setLeads(data.leads); setSavedSearches(data.searches ?? []); setLoaded(true); }).catch(problem => setError(problem.message));
  }, []);

  async function search(event) {
    event.preventDefault();
    if (!country || busy) return;
    setBusy(true); setNotice(''); setError('');
    try {
      const result = await api('/search', 'POST', { query, next: isNext, business_age:businessAge });
      setLeads(result.leads); setLoaded(true); setLastQuery(query); setDetailId(null); setPage(0);
      setNotice(result.added ? result.added + ' new leads added.' : 'No new contacts with matching public sources were found.');
    } catch (problem) { setError(problem.message); if(problem.status===429)setCooldown(problem.retryAfter||60); }
    finally { setBusy(false); }
  }

  async function removeLead(lead) {
    if (busy) return;
    setBusy(true);setError('');setNotice('');
    try {
      const result=await api('/'+lead.id+'/archive','POST',{});
      setLeads(result.leads);setDetailId(null);setRemoveTarget(null);setNotice(lead.name+' removed from active leads. History has been kept.');
    } catch(problem){setError(problem.message);}
    finally{setBusy(false);}
  }

  async function contactResearch(lead){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{const result=await api('/'+lead.id+'/research-contacts','POST',{});setLeads(result.leads);setDetailId(lead.id);setNotice(result.phone_found?'Published business contact found. Review its source.':'Research completed. No verified public business phone was found.');}catch(problem){setError(problem.message);}finally{setBusy(false);}
  }
  async function openEmail(lead){
    if(busy)return;setBusy(true);setError('');setNotice('Preparing a personalised draft for '+lead.name+'…');setReviewError('');
    try{
      if(!['discovered','ready'].includes(lead.status)){const thread=await api('/'+lead.id+'/mail-thread','POST',{});window.location.assign('/wpnazmul/messages?tab=enquiries&thread='+thread.thread_id);return;}
      if(lead.status==='discovered'){await api('/'+lead.id+'/save','POST',{});setLeads(items=>items.map(item=>item.id===lead.id?{...item,status:'ready'}:item));}
      const draft=await api('/'+lead.id+'/generate-draft','POST',{tone:draftTone});setSelected({...lead,...draft,status:'ready'});
    }catch(problem){setSelected({...lead,status:'ready'});setReviewError(problem.message+' You can edit and review the draft manually.');}finally{setBusy(false);}
  }
  function whatsappDraft(form){
    const phone=selected?.crm?.phone?.replace(/[^0-9]/g,'');if(!phone)return;
    const fields=new FormData(form);const text=fields.get('subject')+'\n\n'+fields.get('body')+(invite?.url?'\n\nStart live conversation:\n'+invite.url:'');
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
  }
  async function save(lead) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api('/' + lead.id + '/save', 'POST', {});
      setLeads(items => items.map(item => item.id === lead.id ? { ...item, status: result.status } : item));
      setNotice(lead.name + ' saved.');
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }

  async function saveEmailDraft(form) {
    if(busy||!selected||!form.reportValidity())return;
    const fields=new FormData(form);
    setBusy(true);setReviewError('');
    try{
      const result=await api('/'+selected.id+'/draft','POST',{subject:fields.get('subject'),body:fields.get('body')});
      setLeads(result.leads);setSelected(null);setNotice('Email draft saved.');
    }catch(problem){setReviewError(problem.message);}finally{setBusy(false);}
  }

  async function send(event) {
    event.preventDefault();
    if (busy || !selected || !invite || invite.lead_id !== selected.id || !window.confirm('Send this email to ' + selected.email + '?')) return;
    const input = new FormData(event.currentTarget);
    const id = selected.id;
    setBusy(true); setNotice(''); setReviewError('');
    try {
      const result = await api('/' + id + '/send', 'POST', { subject: input.get('subject'), body: input.get('body'), invitation: invite.token });
      setLeads(items => items.map(item => item.id === id ? { ...item, status: result.status } : item));
      setSelected(null);
      setNotice(result.status === 'accepted' ? 'SMTP accepted the email.' : 'Delivery could not be confirmed. Check the mailbox before retrying.');
    } catch (problem) { setReviewError(problem.message); }
    finally { setBusy(false); }
  }

  const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const due = lead => lead.crm?.follow_up_date && lead.crm.follow_up_date <= today && !lead.crm.follow_up_done;
  const saved = leads.filter(lead => lead.status !== 'discovered' && !lead.crm?.archived);
  const ready = saved.filter(lead => lead.status === 'ready');
  const followups = saved.filter(due);
  const followList = saved.filter(lead=>lead.crm?.follow_up_date && (followView==='Completed'?lead.crm.follow_up_done:followView==='Overdue'?due(lead):followView==='Upcoming'?(!lead.crm.follow_up_done&&lead.crm.follow_up_date>today):!lead.crm.follow_up_done));
  const savedMatches = saved.filter(lead=>[lead.name,lead.email,lead.crm?.notes,lead.crm?.contact_name].join(' ').toLowerCase().includes(savedFilter.trim().toLowerCase()));
  const shown = [...(tab === 'Follow-ups' ? followList : tab === 'Discover' ? leads.filter(lead=>!lead.crm?.archived) : savedMatches)].sort((left, right) => sort === 'name' ? left.name.localeCompare(right.name) : right.id - left.id);
  const pages = Math.max(1, Math.ceil(shown.length / 6));
  const current = Math.min(page, pages - 1);
  const groups = leadStages.map(stage=>[stage,saved.filter(lead=>(lead.crm?.stage||(lead.status==='accepted'?'Contacted':'New'))===stage)]);
  const filters = {keywords,country,business,service,role,business_age:businessAge};
  function applyFilters(value){
    setBusinessAge(value.business_age??'any');setKeywords(value.keywords??'');setCountry(value.country??'');setBusiness(value.business??'');setService(value.service??'');setRole(value.role??'');setLastQuery('');
  }
  async function saveSearch(){
    if(!country||busy)return;
    setBusy(true);setError('');
    try{
      const data=await api('/saved-searches','POST',filters);
      setSavedSearches(data.searches);setNotice('Search saved.');
    }catch(problem){setError(problem.message);}finally{setBusy(false);}
  }
  const cards = [['Saved leads', saved.length, Users], ['Ready to contact', ready.length, Target], ['Follow-ups due', followups.length, CalendarDays], ['Drafts ready', ready.filter(lead => lead.body).length, Mail]];
  const tabs = [['Discover',Search],['Saved leads',Folder],['Pipeline',LayoutGrid],['Follow-ups',CalendarDays]];
  return <div className="lead-dashboard">
    <header className="ws-title lead-page-heading">
    <div><h1>Good connections start here.</h1><p>Find the right fit. Keep the next step clear.</p></div>
    <div className="lead-tool-actions lead-tool-top">
      <button type="button" className="btn btn-outline" onClick={()=>setPanel({type:'csv'})}>Import CSV</button>
      <button type="button" className="btn btn-dark" onClick={()=>setPanel({type:'lead'})}>＋ Add a lead</button>
    </div>
    </header>
    <div className="lead-metrics">
      {cards.map(([label,value,Icon])=><div className="lead-metric panel" key={label}><span>{label}<Icon size={17} aria-hidden="true"/></span><strong>{loaded?value:'–'}</strong></div>)}
    </div>
    <nav className="lead-tabs" aria-label="Lead views">
      {tabs.map(([label,Icon])=><button key={label} type="button" aria-pressed={tab===label} onClick={()=>{setTab(label);setDetailId(null);setPage(0);}}><Icon size={17} aria-hidden="true"/>{label}{label==='Saved leads'&&loaded&&<span className="lead-count">{saved.length}</span>}</button>)}
    </nav>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className={tab==='Discover'?'lead-discover':''}>
      {tab==='Discover'&&<section className="panel lead-filter-panel"><div className="panel-body"><div className="lead-filter-intro"><span className="lead-initial"><Target size={17} aria-hidden="true"/></span><div><h2>Your next good connection.</h2><p>A few filters make a useful start.</p></div></div>
        <form onSubmit={search} className="stack">
          <label className="field"><span className="lead-filter-label">Keywords <small>Optional</small></span><span className="lead-keyword"><Search size={15} aria-hidden="true"/><select value={keywords} onChange={event=>setKeywords(event.target.value)}><option value="">Choose a keyword</option>{leadOptions.keywords.map(option=><option key={option}>{option}</option>)}</select></span><small>Choose a focus for the AI search.</small></label>
          <label className="field">Country / region<select value={country} onChange={event=>setCountry(event.target.value)}><option value="">Choose a country</option>{leadOptions.countries.map(option=><option key={option}>{option}</option>)}</select></label>
          <label className="field">Business age<select value={businessAge} onChange={event=>setBusinessAge(event.target.value)}><option value="any">Any age</option><option value="0-1">Started within 1 month</option><option value="1-3">Started 1–3 months ago</option><option value="3-6">Started 3–6 months ago</option></select><small>Dated public launch evidence is required for startup searches.</small></label>
          <label className="field">Business type<select value={business} onChange={event=>setBusiness(event.target.value)}><option value="">Any business type</option>{leadOptions.industries.map(option=><option key={option}>{option}</option>)}</select></label>
          <label className="field">Service opportunity<select value={service} onChange={event=>setService(event.target.value)}>
            <option value="">Any service</option>{leadOptions.services.map(option=><option key={option}>{option}</option>)}
          </select></label>
          <details><summary>More targeting options</summary><label className="field">Contact role<input value={role} maxLength={60} onChange={event=>setRole(event.target.value)} placeholder="Founder, director, owner…"/></label></details>
          <button className="btn btn-dark" disabled={busy||!country||cooldown>0}><Search size={16} aria-hidden="true"/>{busy?'Finding…':cooldown>0?'Try again in '+cooldown+'s':isNext?'Find next':'Find leads'}</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>{setBusinessAge('any');setKeywords('');setCountry('');setBusiness('');setService('');setRole('');setLastQuery('');setDetailId(null);setPage(0);setNotice('');setError('');}}>Reset</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={!country||busy} onClick={()=>void saveSearch()}>Save search</button>
        </form>
        <div className="stack lead-saved-searches"><strong>A useful starting point</strong>
          <button type="button" className="btn btn-outline btn-sm" onClick={()=>applyFilters({country:'United Kingdom',keywords:'WordPress development partner',business:'Web design and digital agencies'})}>UK agency partners</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={()=>applyFilters({country:'United States',business:'Ecommerce businesses',service:'WooCommerce development'})}>US online stores</button>
          {[['US new startups',{country:'United States',business_age:'1-3',keywords:'newly launched businesses'}],['UK new businesses',{country:'United Kingdom',business_age:'1-3'}],['European startups',{country:'Europe (multiple countries)',business_age:'1-3'}],['UK local services',{country:'United Kingdom',business:'Professional services'}],['US hospitality',{country:'United States',business:'Hospitality and tourism businesses'}],['EU online stores',{country:'Netherlands',business:'Ecommerce businesses'}]].map(([label,value])=><button key={label} type="button" className="btn btn-outline btn-sm" onClick={()=>applyFilters(value)}>{label}</button>)}
          <strong>Saved searches</strong>{savedSearches.map(item=><button type="button" className="btn btn-outline btn-sm" key={item.id} onClick={()=>applyFilters(item.filters)}>{item.label}</button>)}
        </div>
      </div></section>}
      <section className="panel"><div className="panel-head lead-results-head"><div>{tab==='Discover'&&<p className="lead-results-eyebrow">A place to start</p>}<h2>{tab==='Discover'?'People worth a closer look.':tab}</h2><p>{tab==='Follow-ups'?'Scheduled follow-ups and tasks.':loaded?shown.length+(tab==='Discover'?' results':' saved leads'):'Loading leads…'}</p></div>
        {tab!=='Pipeline'&&<label className="field">Sort by<select value={sort} onChange={event=>{setSort(event.target.value);setPage(0);}}><option value="recent">Most recent</option><option value="name">Business name</option></select></label>}
      </div>
      {tab==='Saved leads'&&<div className="panel-body lead-tool-actions"><label className="field">Search saved leads<input type="search" value={savedFilter} onChange={event=>{setSavedFilter(event.target.value);setPage(0);}}/></label><button type="button" className="btn btn-outline btn-sm" disabled={!shown.length} onClick={()=>exportLeads(shown)}>Export filtered CSV</button></div>}
      {tab==='Follow-ups'&&<div className="panel-body"><label className="field">Show<select value={followView} onChange={event=>{setFollowView(event.target.value);setPage(0);}}>{['Open','Overdue','Upcoming','Completed'].map(view=><option key={view}>{view}</option>)}</select></label></div>}
      {tab==='Pipeline'?<div className="panel-body lead-metrics">{groups.map(([label,items])=><div className="stack" key={label}><strong>{label} · {items.length}</strong>{items.map(lead=><button key={lead.id} type="button" className="btn btn-outline btn-sm" onClick={()=>setPanel({type:"lead",lead})}>{lead.name} · Edit stage</button>)}</div>)}</div>:
      <>{loaded&&!shown.length&&<div className="panel-body"><p>{tab==='Follow-ups'?'No follow-ups due.':tab==='Discover'?'Run a search to discover leads.':'No saved leads yet.'}</p></div>}
      <div><ul className="lead-rows">{shown.slice(current*6,current*6+6).map(lead=><li key={lead.id}>
        <span className="lead-initial" aria-hidden="true">{lead.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()}</span>
        <div className="lead-row-copy"><strong>{lead.name}</strong><p className="lead-row-contact">{[lead.crm?.contact_name,lead.crm?.role].filter(Boolean).join(" · ") || lead.email}</p>{(lead.crm?.country||lead.crm?.industry)&&<p className="lead-row-meta">{[lead.crm?.country,lead.crm?.industry].filter(Boolean).join(" · ")}</p>}{tab==="Discover"&&<><p className="lead-row-reason">{lead.reason}</p>{lead.crm?.service&&<span className="lead-service-tag">{lead.crm.service}</span>}</>}{tab==="Follow-ups"&&<p>{lead.crm.follow_up_date} · {lead.crm.follow_up_task}</p>}</div><div className="lead-row-actions lead-icon-actions">
          <button type="button" className="btn btn-outline lead-action-icon" aria-label={'View details: '+lead.name} title="View details" data-tooltip="Details" onClick={()=>setDetailId(lead.id)}><Eye size={17}/></button>
          <button type="button" className="btn btn-outline lead-action-icon" aria-label={lead.status==='discovered'?'Save lead: '+lead.name:'Lead saved'} title={lead.status==='discovered'?'Save lead':'Saved'} data-tooltip={lead.status==='discovered'?'Save':'Saved'} disabled={busy||lead.status!=='discovered'} onClick={()=>void save(lead)}>{lead.status==='discovered'?<BookmarkPlus size={17}/>:<Check size={17}/>}</button>
          <button type="button" className="btn btn-outline lead-action-icon" aria-label={'Email '+lead.name} title="Personalised email" data-tooltip="Email" disabled={busy||lead.status==='sending'} onClick={()=>void openEmail(lead)}><Mail size={17}/></button>
          <button type="button" className="btn btn-outline lead-action-icon" aria-label={'Research public contacts: '+lead.name} title="AI contact research" data-tooltip="Find contacts" disabled={busy} onClick={()=>void contactResearch(lead)}><Sparkles size={17}/></button>
          <button type="button" className="btn btn-outline lead-action-icon lead-action-remove" aria-label={'Remove lead: '+lead.name} title="Remove lead" data-tooltip="Remove" disabled={busy||lead.status==='sending'} onClick={()=>setRemoveTarget(lead)}><Trash2 size={17}/></button>
        </div>
      </li>)}</ul>
      </div>
      {shown.length>0&&<div className="panel-body lead-pagination"><span>Showing {current*6+1}–{Math.min((current+1)*6,shown.length)} of {shown.length}</span><div><button type="button" className="btn btn-outline btn-sm" disabled={!current} onClick={()=>setPage(current-1)}>Previous</button> <span>{current+1} / {pages}</span> <button type="button" className="btn btn-outline btn-sm" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next</button></div></div>}
      </>}
      </section>
    </div>
    <footer className="lead-source"><span>Search public websites and review the source before sending outreach.</span><strong>Data source · OpenAI web search</strong></footer>
    {detail&&<LeadDetails key={detail.id} lead={detail} close={()=>setDetailId(null)} save={save} review={lead=>{setDetailId(null);void openEmail(lead);}} api={api} onUpdated={setLeads} busy={busy}/>}
    <LeadTools api={api} panel={panel} onClose={()=>setPanel(null)} onSaved={result=>{setLeads(result.leads);setPanel(null);setNotice(result.imported!=null?result.imported+' imported · '+result.skipped+' skipped.':'Lead details saved.');}} countries={leadOptions.countries} industries={leadOptions.industries} services={leadOptions.services}/>
    <dialog ref={review} className="lead-email-dialog" aria-labelledby="lead-email-heading"
      onCancel={event=>{if(busy)event.preventDefault();}} onClose={()=>{if(!review.current?.open)setSelected(null);}}>
    {selected && <><div className="panel-head"><h2 id="lead-email-heading">Email {selected.name}</h2><button type="button" className="btn btn-dark btn-sm" disabled={busy} onClick={()=>void generateDraft()}>{generating?'Generating…':'Regenerate AI draft'}</button></div><div className="panel-body">
      <form key={selected.id} className="stack" onSubmit={send}>
        <p className="lead-mail-recipient"><strong>{selected.name}</strong><br/>From hello@wpnazmul.com → {selected.email}</p>
        <label className="field">Start live conversation URL<input readOnly value={invite?.lead_id===selected.id?invite.url:''} placeholder="Preparing your unique link…"/></label>
        {invite?.lead_id===selected.id&&<button type="button" className="btn btn-outline btn-sm" onClick={()=>navigator.clipboard.writeText(invite.url).catch(()=>setReviewError('Could not copy the link.'))}>Copy chat link</button>}
        <p>This exact link will be added at the end of the email.</p>
        {reviewError && <p role="alert">{reviewError}</p>}
        <label className="field">Writing tone<select value={draftTone} disabled={busy} onChange={event=>setDraftTone(event.target.value)}><option value="friendly">Friendly and direct</option><option value="professional">Professional</option><option value="brief">Short and casual</option></select></label>
        <label className="field">Subject<input name="subject" defaultValue={selected.subject} required maxLength={190}/></label>
        <label className="field">Message<textarea name="body" defaultValue={selected.body} required rows={8} maxLength={4000}/></label>
        <button className="btn btn-dark" disabled={busy||!invite||invite.lead_id!==selected.id}>Send email</button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={event=>void saveEmailDraft(event.currentTarget.form)}>Save email draft</button>
        {selected.crm?.phone?<button type="button" className="btn btn-outline" disabled={busy} onClick={event=>whatsappDraft(event.currentTarget.form)}>Open same draft in WhatsApp</button>:<p className="small muted">Find a published business phone with the contacts icon to prepare a WhatsApp draft.</p>}
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setSelected(null)}>Close review</button>
      </form>
    </div></>}
    </dialog>
    <dialog ref={removeDialog} className="lead-email-dialog lead-remove-dialog" aria-labelledby="remove-lead-title" onCancel={event=>{if(busy)event.preventDefault();}} onClose={()=>setRemoveTarget(null)}>{removeTarget&&<><div className="panel-head"><h2 id="remove-lead-title">Remove {removeTarget.name}?</h2></div><div className="panel-body stack"><p>This removes the lead from active lists. Email and conversation history will be kept.</p><div className="flex"><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>setRemoveTarget(null)}>Keep lead</button><button type="button" className="btn btn-dark" disabled={busy} onClick={()=>void removeLead(removeTarget)}>{busy?'Removing…':'Remove lead'}</button></div></div></>}</dialog>
  </div>;
}
