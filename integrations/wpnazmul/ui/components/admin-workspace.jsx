'use client';

import Link from 'next/link';

import { LeadWorkspace } from './lead-workspace';
import { PublicChatInbox } from './public-chat-inbox';
import { MyPaLauncher, PersonalAssistant } from './personal-assistant';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionLink, Avatar, Icon } from './elements';
import { VisualDialog } from './public-preview';
import { workspace, WorkspaceError, recordId } from '../lib/workspace-client';
import { clearInvoiceIntentsExcept } from '../lib/invoice-intent';
import { DeliveryReview, ProjectFiles, ProjectQuotes } from './workspace-project-panels';
import { AdminInbox, AdminProjectChat, AdminInvoices, AdminActivity, adminApi } from './admin-panels';
import { AdminCms, AiSettings, adminLegacy } from './admin-cms';

const nav=[['overview','grid','Overview'],['orders','folder','Orders'],['messages','chat','Inbox & Mailing'],['leads','users','Lead generation'],['clients','users','Clients'],
 ['files','file','Files'],['invoices','receipt','Invoices'],['services','layout','Services'],['settings','settings','Settings'],['integrations','settings','Integration']];
const names={new:'Awaiting review',quoted:'Quoted',in_progress:'In progress',review:'Client review',completed:'Complete',cancelled:'Cancelled'};
const allowed={new:['quoted','cancelled'],quoted:['in_progress','cancelled'],in_progress:['review','cancelled'],review:['in_progress','completed','cancelled'],completed:[],cancelled:[]};
const ordersPath='/client-projects';
const href=item=>'/wpnazmul/orders/'+recordId(item);

function Title({title,copy,children}){return <div className="ws-title"><div><h1>{title}</h1><p>{copy}</p></div>{children}</div>;}
function Panel({title,action,children}){return <section className="panel"><div className="panel-head"><h2>{title}</h2>{action}</div><div className="panel-body">{children}</div></section>;}
function Status({value}){return <span className={'pill pill-'+(value==='review'?'amber':value==='in_progress'?'blue':value==='completed'?'green':'gray')}>{names[value]||value}</span>;}
function NewOrder(){return <ActionLink href="/wpnazmul/orders?new=1" className="btn btn-dark btn-sm"><Icon name="plus"/>New project</ActionLink>;}

function SignIn(){return <p role="alert">WP Nazmul access could not be verified. Sign in to AP Tech Hub again.</p>;}
function Frame({error,children}){return <div className="wpnazmul-surface">{error&&<p className="admin-error" role="alert">{error}</p>}{children}</div>;}

function OrdersTable({items}){
 return <div className="table-wrap preview-table"><table className="data-table"><thead><tr><th scope="col">Project</th><th scope="col">Client</th><th scope="col">Status</th><th scope="col">Budget indication</th><th scope="col">Action</th></tr></thead>
  <tbody>{items.map(item=><tr key={recordId(item)}><td><strong>{item.title}</strong><div className="subtext">{item.service}</div></td>
   <td><div className="flex"><Avatar initial={item.client_name?.slice(0,1)||'C'}/><strong>{item.client_name||'—'}</strong></div></td>
   <td><Status value={item.status}/></td><td>{item.budget||'—'}</td><td><Link className="table-action" href={href(item)} aria-label={'Manage '+item.title}>Manage</Link></td>
  </tr>)}</tbody></table>{!items.length&&<p className="empty-state">No matching projects.</p>}</div>;
}

function Overview({orders}){
 const [inbox,setInbox]=useState(null);
 useEffect(()=>{let active=true;adminApi('/inbox').then(value=>{if(active)setInbox(value);}).catch(()=>{if(active)setInbox({threads:[],unavailable:true});});return()=>{active=false;};},[]);
 const open=orders.filter(item=>!['completed','cancelled'].includes(item.status));
 const attention=orders.filter(item=>['review','new'].includes(item.status));
 const unread=orders.reduce((sum,item)=>sum+(item.unread_count||0),0);
 return <><Title title="A good day to make progress." copy="Here’s what’s happening in your workspace."><NewOrder/></Title>
  <div className="stats-grid">{[['Active projects',open.length,'Across the loaded projects','folder'],['New requests',orders.filter(item=>item.status==='new').length,'Ready for your review','file'],
    ['Client review',orders.filter(item=>item.status==='review').length,'Waiting on feedback','check'],['Unread messages',unread,'Across the loaded projects','chat']].map(([label,count,copy,icon],index)=>
      <div className={'stat-card'+(index===0?' highlight':'')} key={label}><div className="stat-label">{label}<Icon name={icon}/></div><div className="stat-value">{count}</div><div className="stat-detail">{copy}</div></div>)}</div>
  <div className="dashboard-grid admin-grid">
   <Panel title="A little attention needed" action={<span className="pill pill-amber">{attention.length} items</span>}>
    <div className="attention-list">{attention.slice(0,5).map(item=><div className="attention-item" key={recordId(item)}><span className="attention-icon"><Icon name="file"/></span>
     <div><h3>{item.status==='review'?'A project is in client review':'New project brief'}</h3><p>{item.title}</p></div><Link className="link-btn" href={href(item)}>Review</Link></div>)}
     {!attention.length&&<p>No loaded projects need attention.</p>}</div>
   </Panel>
   <Panel title="Work in motion" action={<small>Loaded projects</small>}>{['new','in_progress','review','completed'].map(status=>{
    const count=orders.filter(item=>item.status===status).length;
    return <div className="between visual-distribution" data-status={status} key={status}><span>{status==='new'?'New requests':names[status]}</span><div className="progress"><span style={{width:(orders.length?100*count/orders.length:0)+'%'}}/></div><strong>{count}</strong></div>;
   })}</Panel>
  </div>
  <section className="panel" style={{marginBottom:23}}><div className="panel-head"><h2>Recent orders</h2><Link className="link-btn" href="/wpnazmul/orders">View all orders</Link></div><OrdersTable items={orders.slice(0,5)}/></section>
  <Panel title="Latest enquiries" action={<Link href="/wpnazmul/messages?tab=enquiries" className="link-btn">View inbox</Link>}>
   {inbox?inbox.unavailable?<p>Recent enquiries are unavailable.</p>:inbox.threads.length?<ul className="admin-simple-list">{inbox.threads.slice(0,4).map(item=><li className="between" key={item.id}><span>{item.name}</span><span className="pill pill-gray">{item.status}</span></li>)}</ul>:<p>No enquiries yet.</p>:<p>Loading enquiries…</p>}
  </Panel>
 </>;
}

function OrderCreation({clients,refresh,close}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const operation=useRef(null);
 async function create(event){
  event.preventDefault();if(busy)return;
  const data=Object.fromEntries(new FormData(event.currentTarget));if(!data.budget.trim())delete data.budget;
  const sign=JSON.stringify(data);
  if(operation.current?.sign!==sign)operation.current={sign,key:crypto.randomUUID()};
  setBusy(true);setError('');
  try{
   const record=await adminApi(ordersPath,'POST',data,operation.current.key);
   operation.current=null;await refresh();close(record.project||record);
  }catch(problem){if(problem instanceof WorkspaceError&&problem.status<500&&![419,429].includes(problem.status))operation.current=null;setError(problem.message);}
  finally{setBusy(false);}
 }
 return <Panel title="Create a project for a client"><form className="stack" onSubmit={create}>
  <label className="field">Client<select name="client_id" required defaultValue=""><option value="" disabled>Choose a client</option>{clients.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
  <label className="field">Title<input name="title" maxLength={180} required/></label><label className="field">Service<input name="service" maxLength={120} required/></label>
  <label className="field">Brief<textarea name="brief" maxLength={10000} required/></label><label className="field">Budget indication<input name="budget" maxLength={120}/></label>
  {error&&<p className="admin-error" role="alert">{error}</p>}<button className="btn btn-dark btn-sm" disabled={busy||!clients.length}>Create project</button>
 </form></Panel>;
}

function Orders({orders,clients,more,loadMore,showNew,refresh}){
 const [query,setQuery]=useState(''),[status,setStatus]=useState('');
 const router=useRouter();
 const matched=orders.filter(item=>(!status||status===item.status)&&[item.title,item.client_name,item.service].some(text=>text?.toLowerCase().includes(query.trim().toLowerCase())));
 return <><Title title="From first brief to final delivery." copy="Keep every project moving in the right direction."><NewOrder/></Title>
  <section className="panel"><div className="orders-toolbar between"><label className="search-field"><Icon name="search"/><input type="search" aria-label="Search projects" placeholder="Search projects or clients…" value={query} onChange={event=>setQuery(event.target.value)}/></label>
   <select aria-label="Filter by status" value={status} onChange={event=>setStatus(event.target.value)}><option value="">All statuses</option>{Object.entries(names).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></div>
   <OrdersTable items={matched}/>{more&&<div className="panel-body"><button className="btn btn-outline btn-sm" type="button" onClick={()=>void loadMore()}>Load older projects</button></div>}
  </section>
  {showNew&&<OrderCreation clients={clients} refresh={refresh} close={record=>router.push(href(record))}/>}
 </>;
}

function OrderDetail({id,actor,refresh}){
 const [data,setData]=useState(null),[notice,setNotice]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const [tab,setTab]=useState('Overview');
 const dialog=useRef(null);
 const router=useRouter();
 const endpoint=ordersPath+'/'+encodeURIComponent(id);
 const read=useCallback(async()=>{const record=await adminApi(endpoint);setData(record.project||record);},[endpoint]);
 useEffect(()=>{let active=true;adminApi(endpoint).then(record=>{if(active)setData(record.project||record);}).catch(problem=>{if(active)setError(problem.message);});return()=>{active=false;};},[endpoint]);
 useEffect(()=>{if(data&&!dialog.current?.open)dialog.current?.showModal();},[data]);
 async function save(event){
  event.preventDefault();if(saving)return;
  const next=new FormData(event.currentTarget);
  setSaving(true);setNotice('');setError('');
  try{await adminApi(endpoint,'PATCH',{revision:data.revision,status:next.get('status'),due_date:next.get('due_date')||null});await Promise.all([read(),refresh()]);setNotice('Project updated.');}
  catch(problem){setError(problem.message);}finally{setSaving(false);}
 }
 return <><Title title="A clear view of your project." copy="Review scope, status and the corresponding project records."/><Link href="/wpnazmul/orders" className="back-link"><Icon name="back"/>All orders</Link>
  {!data&&<p role={error?'alert':'status'}>{error||'Loading project…'}</p>}
  <VisualDialog dialogRef={dialog} title="A clear view of your project." className="wide admin-order-dialog" onClose={()=>router.push('/wpnazmul/orders')}
   footer={<><button type="button" className="btn btn-outline btn-sm" onClick={()=>dialog.current?.close()}>Close order</button>
    {tab==='Overview'&&<button type="submit" className="btn btn-dark btn-sm" form="admin-order-update" disabled={saving}>Save project changes</button>}</>}>
   {data&&<><div className="between"><div><h3>{data.title}</h3><p className="muted">{data.client_name} · {data.service}</p></div><Status value={data.status}/></div>
    <div className="detail-tabs" role="group" aria-label="Order detail">{['Overview','Quotes','Messages','Files','Invoices','Activity'].map(item=><button type="button" key={item} aria-pressed={tab===item}
     className={tab===item?'active':''} onClick={()=>setTab(item)}>{item}</button>)}</div>
    {error&&<p className="admin-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {tab==='Overview'?<><div className="admin-order-grid"><div><h3>Project brief</h3><p className="text-pre">{data.brief}</p>
     <dl><div className="detail-kv"><dt>Service</dt><dd>{data.service}</dd></div><div className="detail-kv"><dt>Client budget</dt><dd>{data.budget||'To be discussed'}</dd></div></dl></div>
     <form id="admin-order-update" key={data.revision} className="stack" onSubmit={save}>
      <label className="field">Project status<select name="status" defaultValue={data.status}>{[data.status,...(allowed[data.status]||[])].map(value=><option key={value} value={value}>{names[value]||value}</option>)}</select></label>
      <label className="field">Due date<input type="date" name="due_date" defaultValue={data.due_date?.slice(0,10)||''}/></label>
     </form></div><DeliveryReview realm="admin" path={endpoint} projectStatus={data.status} onDecision={read}/></>:
     tab==='Quotes'?<ProjectQuotes realm="admin" path={endpoint}/>:
     tab==='Messages'?<AdminProjectChat projects={[data]} selectedId={id}/>:
     tab==='Files'?<ProjectFiles realm="admin" path={endpoint}/>:
     tab==='Invoices'?<AdminInvoices project={data} actor={actor}/>:
     <AdminActivity project={data}/>}
   </>}
  </VisualDialog>
 </>;
}

function ProjectScreen({projects,actor,kind,more,loadMore}){
 const [id,setId]=useState('');
 const [search,setSearch]=useState('');
 const [status,setStatus]=useState('all');
 const files=kind==='files';
 const terms=search.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const visible=files?projects.filter(item=>{
  const text=[item.title,item.client_name,recordId(item)].filter(Boolean).join(' ').toLowerCase();
  return (status==='all'||item.status===status)&&terms.every(term=>text.includes(term));
 }):projects;
 const project=visible.find(item=>recordId(item)===id)||visible[0];
 return <><Title title={files?'The details belong together.':'Clear projects. Clear invoices.'} copy={files?'Briefs, references, and project files, within easy reach.':'Issue and review project invoices.'}/>
  {files&&<div className="panel"><div className="panel-body"><div className="client-search-controls">
   <label className="field">Search projects<input type="search" placeholder="Search by project name, client or ID" value={search} onChange={event=>setSearch(event.target.value)}/></label>
   <label className="field">Project status<select value={status} onChange={event=>setStatus(event.target.value)}>
    <option value="all">All statuses</option>{Object.entries(names).map(([value,label])=><option value={value} key={value}>{label}</option>)}
   </select></label>
   {(search||status!=='all')&&<button type="button" className="btn btn-outline btn-sm" onClick={()=>{setSearch('');setStatus('all');}}>Clear filters</button>}
  </div></div></div>}
  {project?<><label className="field admin-picker">Project<select value={recordId(project)} onChange={event=>setId(event.target.value)}>{visible.map(item=><option key={recordId(item)} value={recordId(item)}>{item.title}</option>)}</select></label>
   {files?<ProjectFiles realm="admin" path={ordersPath+'/'+recordId(project)} key={recordId(project)}/>:<AdminInvoices key={recordId(project)} project={project} actor={actor}/>}</>:
   <p className="empty-state" role="status">{projects.length?'No projects match your search and filter.':'No projects are available.'}</p>}
  {files&&more&&<button type="button" className="btn btn-outline btn-sm" onClick={loadMore}>Load more projects</button>}
 </>;
}

function Clients({clients,orders}){
 const [search,setSearch]=useState('');
 const [verification,setVerification]=useState('all');
 const terms=search.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const visible=clients.filter(client=>{
  const text=(client.name+' '+client.email).toLowerCase();
  return terms.every(term=>text.includes(term)) &&
   (verification==='all'||Boolean(client.email_verified)===(verification==='verified'));
 });
 return <><Title title="The people behind the projects." copy="A simple view of your client relationships."/>
  <div className="panel"><div className="panel-body">
   <div className="client-search-controls">
    <label className="field">Search clients<input type="search" placeholder="Search by name or email" value={search} onChange={event=>setSearch(event.target.value)}/></label>
    <label className="field">Email verification<select value={verification} onChange={event=>setVerification(event.target.value)}>
      <option value="all">All clients</option><option value="verified">Verified email</option><option value="unverified">Unverified email</option>
    </select></label>
    {(search||verification!=='all')&&<button type="button" className="btn btn-outline btn-sm" onClick={()=>{setSearch('');setVerification('all');}}>Clear filters</button>}
   </div>
  </div></div>
  {visible.length?<div className="clients-grid">{visible.map(item=>{
    const projects=orders.filter(order=>order.client_id===item.id);
    const active=projects.filter(order=>!['new','completed','cancelled'].includes(order.status)).length;
    return <article className="client-card" key={item.id}><Avatar className="large purple" initial={item.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('')}/><h3>{item.name}</h3><p>{item.email}</p><span className="pill pill-gray">{item.email_verified?"Verified email":"Unverified email"}</span>
    <div className="client-meta"><span>{projects.length} loaded projects</span><span>{active} active</span></div>
    {projects.length?<Link href={'/wpnazmul/messages?project='+encodeURIComponent(recordId(projects[0]))} className="btn btn-outline btn-sm btn-full"><Icon name="chat"/>Open conversation</Link>:
    <Link href={'/wpnazmul/orders?client='+encodeURIComponent(item.id)} className="btn btn-outline btn-sm btn-full"><Icon name="folder"/>View projects</Link>}</article>;
  })}</div>:<p className="empty-state" role="status">{clients.length?"No clients match your search and filter.":"No client accounts are available."}</p>}
 </>;
}

const connectionFields={
 mail:[
  ['host','SMTP host','text','smtp.hostinger.com'],
  ['port','SMTP port','select','465'],
  ['username','Mailbox username','email','hello@wpnazmul.com'],
 ],
 sms:[
  ['endpoint','OneCodeSoft Send SMS API endpoint','url','https://'],
  ['sender','Sender ID','text',''],
  ['recipient','Notification phone number','tel','+8801XXXXXXXXX'],
 ],
};

function ConnectionForm({kind}){
 const [saved,setSaved]=useState(null),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const path='/integration-settings/'+kind;
 useEffect(()=>{
  let active=true;
  adminApi(path).then(data=>{if(active)setSaved(data);}).catch(problem=>{if(active)setError(problem.message);});
  return ()=>{active=false;};
 },[path]);
 async function save(event){
  event.preventDefault();
  const form=event.currentTarget;
  const data=Object.fromEntries(new FormData(form));
  if(!data.secret)delete data.secret;
  if(event.nativeEvent.submitter?.value==='clear')data.clear_secret=true;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await adminApi(path,'PUT',data);
   setSaved(result);
   form.elements.secret.value='';
   setNotice(data.clear_secret?'Credential removed.':'Settings saved.');
  }catch(problem){setError(problem.message);}
  finally{setBusy(false);}
 }
 return <div className="stack">
  {error&&<p role="alert">{error}</p>}
  {!saved&&!error&&<p role="status">Loading connection settings…</p>}
  {saved&&<form className="stack" onSubmit={save}>
   {connectionFields[kind].map(([name,label,type,hint])=><label className="field" key={name}>{label}
    {type==='select'?<select name={name} defaultValue={String(saved[name]??hint)}><option value="465">465 · TLS</option><option value="587">587 · STARTTLS</option></select>:
     <input name={name} type={type} defaultValue={saved[name]??(name==='username'?hint:'')} placeholder={hint} required/>}
   </label>)}
   <label className="field">{kind==='mail'?'Mailbox password':'OneCodeSoft API key'}<input type="password" name="secret" autoComplete="off" maxLength={512} placeholder={saved.has_secret?'********':undefined}/></label>
   <p className="small muted">Saved settings are encrypted. Sending is pending activation.</p>
   {notice&&<p role="status">{notice}</p>}
   <div className="flex"><button className="btn btn-dark btn-sm" disabled={busy}>{kind==='mail'?'Save mail settings':'Save SMS settings'}</button>
   {saved.has_secret&&<button className="btn btn-outline btn-sm" value="clear" disabled={busy}>Remove credential</button>}</div>
  </form>}
 </div>;
}

function Integrations({publishedProfile}){
 const live=true;
 const [sms,setSms]=useState(null),[error,setError]=useState('');
 const [acquisition,setAcquisition]=useState(null),[acquisitionError,setAcquisitionError]=useState('');
 const [busy,setBusy]=useState(false),[review,setReview]=useState(null);
 const endpoint='/api/admin/acquisition';
 useEffect(()=>{
  let active=true;
  adminApi('/integrations').then(data=>{if(active)setSms(data);}).catch(problem=>{if(active)setError(problem.message);});
  if(!live){
   adminLegacy(endpoint).then(data=>{if(active)setAcquisition(data);}).catch(problem=>{if(active)setAcquisitionError(problem.message);});
  }
  return()=>{active=false;};
 },[live]);
 async function acquisitionAction(path,method='POST',payload={},reviewDraft=false){
  setBusy(true);setAcquisitionError('');
  try{
   const result=await adminLegacy(endpoint+path,method,payload,crypto.randomUUID());
   if(reviewDraft)setReview(result);
   if(path.endsWith('/queue'))setReview(null);
   setAcquisition(await adminLegacy(endpoint));
  }catch(problem){setAcquisitionError(problem.message);}
  finally{setBusy(false);}
 }
 return <><Title title="Integration" copy="Manage connections for your workspace."/>
 <div className="stack">
  <AiSettings mode="key" keyProvider="openai"/>
  <AiSettings mode="key" keyProvider="gemini"/>
  <AiSettings profile={publishedProfile}/>
  {live&&<Panel title="Mail configuration"><ConnectionForm kind="mail"/></Panel>}
  <Panel title="Client Hunting Automation">
   <p>Outreach mailbox: hello@wpnazmul.com{!live&&' · Simulation only'}</p>
   {live?<p>Save the mailbox credentials above. Live outreach also needs a lead source.</p>:<>
   {acquisitionError&&<p role="alert">{acquisitionError}</p>}
   {acquisition&&<>
    <p>{acquisition.paused?'Paused':'Running'} · {acquisition.counts.fixture_leads} sample leads · {acquisition.outbox.length} outbox records</p>
    <div className="flex" style={{flexWrap:'wrap',marginBlock:12}}>
     <button className="btn btn-outline btn-sm" disabled={busy} onClick={()=>acquisitionAction('/fixtures')}>Load sample leads</button>
     <button className="btn btn-outline btn-sm" disabled={busy} onClick={()=>acquisitionAction('/pause','PATCH',{paused:!acquisition.paused})}>{acquisition.paused?'Resume simulation':'Pause simulation'}</button>
     <button className="btn btn-outline btn-sm" disabled={busy||acquisition.paused} onClick={()=>acquisitionAction('/run-mock')}>Run simulated dispatch</button>
    </div>
    <ul className="admin-simple-list">{acquisition.leads.filter(lead=>lead.qualification_status==='qualified').map(lead=><li className="between" key={lead.id}>
     <span>{lead.first_name} · {lead.email}</span>
     <button className="btn btn-outline btn-sm" disabled={busy} onClick={()=>acquisitionAction('/leads/'+lead.id+'/draft','POST',{ai_provider:'openai'},true)}>Generate sample draft</button>
    </li>)}</ul>
    {review&&<section className="stack" aria-label="Review outreach draft">
     <h3>{review.subject_en}</h3><p className="text-pre">{review.english_body}</p>
     <button className="btn btn-dark btn-sm" disabled={busy||acquisition.paused} onClick={()=>acquisitionAction('/drafts/'+review.id+'/queue','POST',{revision:review.revision,approved_for_fake:true})}>Approve and queue simulation</button>
    </section>}
   </>}
   {!acquisition&&!acquisitionError&&<p role="status">Loading acquisition status…</p>}
   </>}
  </Panel>
  <Panel title="Client message SMS">
   <p>Get a text when a client sends a new project message.</p>
   {live?<ConnectionForm kind="sms"/>:<>
   {error?<p role="alert">{error}</p>:sms?<span className={'pill '+(sms.enabled?'pill-green':'pill-gray')}>{sms.enabled?'Enabled':sms.configured?'Off':'Setup required'}</span>:<p role="status">Checking SMS configuration…</p>}
   {sms&&!sms.configured&&<p>Connect Twilio and set the sender and notification phone numbers on the server.</p>}
   </>}
  </Panel>
 </div>
 </>;
}

export function AdminWorkspace({view,order,showNew,clientFilter,messageProject,inboxTab,publishedProfile}){
 const [state,setState]=useState({user:undefined,orders:[],clients:[],cursor:null,error:''});
 const sequence=useRef(0),paging=useRef(false);
 const router=useRouter();
 const showEnquiries=inboxTab==='enquiries';
 const showPa=inboxTab==='pa';
 const showLive=inboxTab==='live';
 const needsProjects=['overview','orders','clients','files','invoices'].includes(view)||(view==='messages'&&!showEnquiries&&!showPa&&!showLive);
 const needsClients=['orders','clients'].includes(view);
 const refresh=useCallback(async()=>{
  const count=++sequence.current;
  try{
   const {user}=await adminApi('/session');
   if(count!==sequence.current)return;
   clearInvoiceIntentsExcept(user?.id);
   if(!user){setState({user:null,orders:[],clients:[],cursor:null,error:''});return;}
   const [orders,clients]=await Promise.all([
    needsProjects?adminApi(ordersPath):{projects:[]},
    needsClients?adminApi('/clients'):{clients:[]},
   ]);
   if(count===sequence.current)setState({user,orders:orders.projects,clients:clients.clients,cursor:orders.has_more?orders.next_cursor:null,error:''});
  }catch(problem){if(count===sequence.current)setState(current=>({...current,error:problem.message}));throw problem;}
 },[needsProjects,needsClients]);
 useEffect(()=>{refresh().catch(()=>{});return()=>{sequence.current++;};},[refresh]);
 async function logout(){
  try{await adminApi('/logout','POST');sequence.current++;clearInvoiceIntentsExcept();setState({user:null,orders:[],clients:[],cursor:null,error:''});router.replace('/wpnazmul');}
  catch(problem){setState(current=>({...current,error:problem.message}));}
 }
 async function loadMore(){
  if(paging.current||!state.cursor)return;
  paging.current=true;const count=sequence.current;
  try{const data=await adminApi(ordersPath+'?before_id='+encodeURIComponent(state.cursor));
   if(count===sequence.current)setState(current=>({...current,orders:[...new Map([...current.orders,...data.projects].map(item=>[recordId(item),item])).values()],cursor:data.has_more?data.next_cursor:null}));
  }catch(problem){if(count===sequence.current)setState(current=>({...current,error:problem.message}));}finally{paging.current=false;}
 }
 if(state.user===undefined)return <main className="container section" id="main"><h1>Admin workspace</h1>{state.error?<><p role="alert">{state.error}</p><button className="btn btn-outline" onClick={()=>void refresh().catch(()=>{})}>Retry session</button></>:<p role="status">Checking your session…</p>}</main>;
 if(!state.user)return <SignIn refresh={refresh}/>;
 let screen;
 switch(view){
  case 'orders':screen=<>{<Orders orders={clientFilter?state.orders.filter(item=>item.client_id===clientFilter):state.orders} clients={state.clients} more={state.cursor} loadMore={loadMore} showNew={showNew} refresh={refresh}/>}
    {order&&<OrderDetail id={order} key={order} actor={state.user.id} refresh={refresh}/>}</>;break;
  case 'messages':screen=<>
   <nav className="detail-tabs admin-inbox-tabs" aria-label="Inbox type">
    <Link href="/wpnazmul/messages" aria-current={!showEnquiries&&!showPa&&!showLive?'page':undefined}>Project messages</Link>
    <Link href="/wpnazmul/messages?tab=enquiries" aria-current={showEnquiries?'page':undefined}>Public enquiries &amp; mailing</Link>
    <Link href="/wpnazmul/messages?tab=live" aria-current={showLive?'page':undefined}>Public live chat</Link>
    <Link href="/wpnazmul/messages?tab=pa" aria-current={showPa?'page':undefined}>My PA</Link>
   </nav>
   {showLive?<><Title title="Public live chat"/><PublicChatInbox/></>:showPa?<><Title title="My PA"/><PersonalAssistant/></>:showEnquiries?<AdminInbox/>:<><Title title="Good communication. Better projects." copy="Your messages, project details, and feedback, together."/>
    <AdminProjectChat key={messageProject||'projects'} projects={state.orders} selectedId={messageProject}/></>}
  </>;break;
  case 'clients':screen=<Clients clients={state.clients} orders={state.orders}/>;break;
  case 'files':case 'invoices':screen=<ProjectScreen projects={state.orders} kind={view} actor={state.user.id} more={state.cursor} loadMore={loadMore}/>;break;
  case 'services':case 'settings':screen=<AdminCms key={view} view={view} publishedProfile={publishedProfile} user={state.user}/>;break;
  case 'leads':screen=<><LeadWorkspace/></>;break;
  case 'integrations':screen=<Integrations publishedProfile={publishedProfile}/>;break;
  default:screen=<Overview orders={state.orders}/>;
 }
 return <Frame key={view} view={view} user={state.user} error={state.error} logout={logout}>{screen}</Frame>;
}
