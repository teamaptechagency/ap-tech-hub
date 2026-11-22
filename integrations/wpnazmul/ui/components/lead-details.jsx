'use client';

import {useEffect,useRef,useState} from 'react';
import {Check,Info,Plus,X} from 'lucide-react';
import {leadStages,leadPriorities} from './lead-crm';

export function LeadDetails({lead,close,save,review,api,onUpdated,busy}) {
 const dialog=useRef(null);
 const [tab,setTab]=useState('Overview'),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const locked=busy||saving;
 useEffect(()=>{dialog.current.showModal();},[]);
 const saved=lead.status!=='discovered';
 const crm=lead.crm??{};
 const stage=crm.stage || (lead.status==='accepted'?'Contacted':'New');
 const represented=[lead.crm?.contact_name,lead.crm?.role].filter(Boolean).join(' · ');
 const status=({accepted:'Mail sent',sending:'Sending',unconfirmed:'Delivery unconfirmed',failed:'Mail sending failed'})[lead.status];
 const fields=[['Country',crm.country],['Business type',crm.industry],['Service fit',crm.service],['Team size',crm.team_size],
  ['Website',<a href={lead.source} target="_blank" rel="noopener noreferrer">{lead.source}</a>],['Email',lead.email],['Business phone',crm.phone],['Phone source',crm.phone_source&&<a href={crm.phone_source} target="_blank" rel="noopener noreferrer">View published source</a>],['Launch date',crm.launch_date],['Launch evidence',crm.launch_source&&<a href={crm.launch_source} target="_blank" rel="noopener noreferrer">View dated announcement</a>]];
 async function update(event,kind){
  event.preventDefault();
  if(locked)return;
  const form=event.currentTarget, data=Object.fromEntries(new FormData(form));
  if(kind==='note'&&!data.note.trim())return;
  if(kind==='note'&&[crm.notes,data.note.trim()].filter(Boolean).join('\n\n').length>4000){setError('Your notes exceed 4,000 characters.');return;}
  const details=kind==='note'?{notes:[crm.notes,data.note.trim()].filter(Boolean).join('\n\n')}:{...data,follow_up_done:data.follow_up_done==='1'};
  const previous=Object.fromEntries(['contact_name','role','country','industry','service','stage','priority','follow_up_date','follow_up_task','follow_up_done','notes','inmail'].filter(key=>crm[key]!=null).map(key=>[key,crm[key]]));
  setSaving(true);setError('');setNotice('');
  try{
   const result=await api('/'+lead.id+'/details','POST',{...previous,...details});
   onUpdated(result.leads);
   if(kind==='note')form.reset();
   setNotice(kind==='note'?'Note added.':'Lead changes saved.');
  }catch(problem){setError(problem.message);}finally{setSaving(false);}
 }
 return <dialog ref={dialog} className={'lead-context-dialog '+(saved?'lead-saved-drawer':'lead-discovery-modal')} aria-labelledby="lead-context-heading" onClose={close} onCancel={event=>{if(locked)event.preventDefault();}}>
  <div className="lead-context-shell">
   <header className="lead-context-head"><h2 id="lead-context-heading">{saved?'Your lead, all together':'A little more context.'}</h2><button type="button" className="btn btn-outline btn-sm" aria-label="Close lead details" disabled={locked} onClick={()=>dialog.current.close()}><X size={17}/></button></header>
   <div className="lead-context-scroll">
    <div className="lead-context-identity"><span className="lead-initial" aria-hidden="true">{lead.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()}</span><div><h3>{lead.name}</h3>{represented&&<p>{represented}</p>}<span className="lead-service-tag">{saved?stage:'Discovered'}</span>{status&&<> <span className="lead-service-tag">{status}</span></>}</div></div>
    {saved&&<nav className="lead-tabs" aria-label="Saved lead sections">{['Overview','Outreach draft','Activity'].map(label=><button type="button" key={label} aria-pressed={tab===label} onClick={()=>setTab(label)}>{label}</button>)}</nav>}
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {tab==='Overview'&&<>
     {!saved&&lead.reason&&<p className="lead-context-reason">{lead.reason}</p>}
     <dl className="lead-context-fields">{fields.filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
     <div className="lead-context-note"><Info size={17} aria-hidden="true"/><div><strong>{lead.reason==='Manually added lead'?'Manually added lead':'Public business information'}</strong><p>Check the source and contact address before sending outreach.</p></div></div>
     {saved&&<>{lead.reason&&<p className="lead-context-reason">{lead.reason}</p>}
       <section className="lead-context-section"><h4>Your next step</h4><form className="stack" key={lead.id} onSubmit={event=>void update(event,'details')}>
         <div className="lead-form-grid">
           <label className="field">Stage<select name="stage" defaultValue={stage}>{leadStages.map(value=><option key={value}>{value}</option>)}</select></label>
           <label className="field">Priority<select name="priority" defaultValue={crm.priority||'Normal'}>{leadPriorities.map(value=><option key={value}>{value}</option>)}</select></label>
         </div>
         <label className="field">Next follow-up task<input name="follow_up_task" maxLength={240} placeholder="e.g. Review the brief and prepare an introduction" defaultValue={crm.follow_up_task}/></label>
         <label className="field">Follow-up date<input name="follow_up_date" type="date" defaultValue={crm.follow_up_date}/></label>
         {crm.follow_up_date&&<label><input type="checkbox" name="follow_up_done" value="1" defaultChecked={Boolean(crm.follow_up_done)}/> Mark follow-up complete</label>}
         <button className="btn btn-dark" disabled={locked}><Check size={16}/> Save lead changes</button>
       </form></section>
       <section className="lead-context-section"><h4>Notes</h4>{crm.notes&&<p className="lead-preline">{crm.notes}</p>}
        <form className="stack" onSubmit={event=>void update(event,'note')}><label className="field">New note<textarea name="note" maxLength={4000} required placeholder="A useful detail, a question, or your next thought…"/></label><button className="btn btn-outline" disabled={locked}><Plus size={16}/> Add note</button></form>
       </section>
     </>}
    </>}
    {tab==='Outreach draft'&&<section className="lead-context-section"><h4>{lead.subject||'Email draft'}</h4><p className="lead-preline">{lead.body||'No email draft yet.'}</p>{lead.status==='ready'&&<button className="btn btn-dark" type="button" onClick={()=>review(lead)}>Review email</button>}</section>}
    {tab==='Activity'&&<dl className="lead-context-fields">{[['Lead created',lead.created_at],['Last record update',lead.updated_at],['Mail status',status]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
   </div>
   {!saved&&<footer className="lead-context-footer"><button type="button" className="btn btn-outline" disabled={locked} onClick={()=>dialog.current.close()}>Close</button><button type="button" className="btn btn-dark" disabled={locked} onClick={()=>void save(lead)}><Plus size={16}/> Save this lead</button></footer>}
  </div>
 </dialog>;
}
