'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, Icon } from './elements';
import { ClientActivity, ClientMessages } from './client-panels';
import { workspace, WorkspaceError, recordId } from '../lib/workspace-client';
import { InvoiceIssuance } from './invoice-issuance';
import { adminLegacy } from './admin-cms';

export const adminApi=(path,method,data,key)=>workspace('admin',path,method,data,key);
const formatDate=value=>typeof value==='string'?value.slice(0,10):'';
const money=(value,currency)=>new Intl.NumberFormat('en',{style:'currency',currency}).format(value/100);
const states=['unread','read','replied','archived'];

export function AdminActivity({project}) {return <ClientActivity project={project} realm="admin"/>;}
export function AdminProjectChat({projects,selectedId}) {return <ClientMessages projects={projects} initial={selectedId} realm="admin" onRead={async()=>{}} embedded/>;}

function InboxThread({id,onUpdate,onBack}){
 const [thread,setThread]=useState(null),[references,setReferences]=useState([]),[referenceError,setReferenceError]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [mail,setMail]=useState(null);
 const key=useRef(null), pending=useRef(false);
 const endpoint='/inbox/'+encodeURIComponent(id);
 useEffect(()=>{
  let active=true;
  adminApi(endpoint).then(data=>{if(active)setThread(data);}).catch(problem=>{if(active)setError(problem.message);});
  adminApi(endpoint+'/references').then(data=>{if(active)setReferences(data.references);}).catch(()=>{if(active)setReferenceError(true);});
  adminApi(endpoint+'/email').then(data=>{if(active)setMail(data);}).catch(()=>{});
  return()=>{active=false;};
 },[endpoint]);
 async function act(run){
  if(pending.current)return;
  pending.current=true;setBusy(true);setError('');setNotice('');
  try{await run();}catch(problem){setError(problem.message);}finally{pending.current=false;setBusy(false);}
 }
 function reply(event){
  event.preventDefault();
  const form=event.currentTarget;
  const body=String(new FormData(form).get('body')).trim();
  if(!body)return;
  void act(async()=>{
   const route=mail?.enabled?'/email':'/simulate-reply';
   if(key.current?.body!==body||key.current?.route!==route)key.current={body,route,key:crypto.randomUUID()};
   let result;
   try{result=await adminApi(endpoint+route,'POST',{body},key.current.key);}
   catch(problem){if(problem instanceof WorkspaceError&&problem.status<500&&![419,429].includes(problem.status))key.current=null;throw problem;}
   if(route==='/email'){
    setMail(await adminApi(endpoint+'/email'));
    if(result.status==='accepted'){key.current=null;form.reset();setNotice('Email accepted by the mail server.');}
    else setNotice('Email delivery is unconfirmed. Check the mailbox before trying again.');
    return;
   }
   key.current=null;form.reset();
   setThread(await adminApi(endpoint));await onUpdate();setNotice('Simulated reply saved. No email was sent.');
  });
 }
 if(!thread)return <p className="panel-body" role={error?'alert':'status'}>{error||'Loading enquiry…'}</p>;
 const entry=thread.thread;
 return <>
  <header className="conversation-head"><button type="button" className="icon-btn mobile-conversation-back" aria-label="Back to enquiries" onClick={onBack}><Icon name="back"/></button>
   <Avatar initial={entry.name.slice(0,1)}/><div><strong>{entry.name}</strong><p>{entry.service||'Website enquiry'}</p></div>
   <div className="conversation-meta"><span className="pill pill-gray">{entry.status}</span></div></header>
  <div className="panel-body admin-thread-tools">
   <label className="field">Enquiry status<select value={entry.status} disabled={busy} onChange={event=>{
    const status=event.target.value;
    void act(async()=>{await adminLegacy('/api/admin/messages/'+id,'PATCH',{status});setThread(await adminApi(endpoint));await onUpdate();setNotice('Enquiry status updated.');});
   }}>{states.map(status=><option key={status}>{status}</option>)}</select></label>
   <section aria-label="Enquiry reference files"><h3>Reference files</h3>
    {referenceError?<p role="alert">References could not be loaded.</p>:references.length?<ul className="admin-simple-list">{references.map(item=><li className="between" key={item.id}>
     <span>{item.name} · {item.bytes.toLocaleString('en')} bytes</span><a className="btn btn-outline btn-sm" download aria-label={'Download '+item.name}
      href={'/api/v1/admin'+endpoint+'/references/'+recordId(item)+'/download'}>Download</a>
    </li>)}</ul>:<p>No reference files attached.</p>}
   </section>
  </div>
  <div className="message-scroll admin-enquiry-log" role="log" aria-label="Enquiry conversation" tabIndex={0}>
   <div className="message-group"><div className="message-bubble"><strong>{entry.name}</strong><p className="text-pre">{entry.body}</p><time dateTime={formatDate(entry.created_at)}>{formatDate(entry.created_at)}</time></div></div>
   {thread.replies.map(item=><div className="message-group mine" key={item.id}><div className="message-bubble"><strong>Simulated reply</strong><p className="text-pre">{item.body}</p>
    <time dateTime={formatDate(item.created_at)}>{formatDate(item.created_at)}</time></div></div>)}
   {mail?.replies.map(item=><div className="message-group mine" key={'email-'+item.id}><div className="message-bubble"><strong>Email · {item.status==='accepted'?'Accepted by mail server':'Delivery unconfirmed'}</strong><p className="text-pre">{item.body}</p>
    <time dateTime={formatDate(item.created_at)}>{formatDate(item.created_at)}</time></div></div>)}
  </div>
  <form className="message-compose" onSubmit={reply}><label className="sr-only" htmlFor="admin-reply">Reply</label>
   <textarea id="admin-reply" name="body" maxLength={4000} required placeholder={mail?.enabled?'Write an email reply…':'Write a local simulated reply…'}/>
   {error&&<p className="admin-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
   <div className="compose-toolbar"><small>{mail?.enabled?mail.sender+' → '+mail.recipient:'Email unavailable · Simulation only'}</small><button className="btn btn-dark btn-sm" disabled={busy}>{mail?.enabled?'Send email':'Save simulated reply'} <Icon name="send"/></button></div>
  </form>
 </>;
}

export function AdminInbox(){
 const [rows,setRows]=useState([]),[cursor,setCursor]=useState(null),[selected,setSelected]=useState(null),[mobile,setMobile]=useState(false);
 const [search,setSearch]=useState(''),[load,setLoad]=useState(true),[error,setError]=useState('');
 const loading=useRef(false);
 useEffect(()=>{
  let active=true;
  adminApi('/inbox').then(data=>{if(active){setRows(data.threads);setCursor(data.has_more?data.next_cursor:null);}}).catch(problem=>{if(active)setError(problem.message);}).finally(()=>{if(active)setLoad(false);});
  return()=>{active=false;};
 },[]);
 async function refresh(){
  const data=await adminApi('/inbox');
  setRows(previous=>[...new Map([...data.threads,...previous.filter(item=>!data.threads.some(row=>row.id===item.id))].map(item=>[item.id,item])).values()]);
 }
 async function older(){
  if(loading.current||cursor===null)return;
  loading.current=true;setError('');
  try{const data=await adminApi('/inbox?before_id='+encodeURIComponent(cursor));
   setRows(current=>[...new Map([...current,...data.threads].map(item=>[item.id,item])).values()]);setCursor(data.has_more?data.next_cursor:null);
  }catch(problem){setError(problem.message);}finally{loading.current=false;}
 }
 const filtered=rows.filter(item=>[item.name,item.service].some(value=>value?.toLowerCase().includes(search.trim().toLowerCase())));
 const current=selected||filtered[0]?.id;
 return <><div className="ws-title"><div><h1>Good communication. Better projects.</h1><p>Read and organise public enquiries.</p></div><span className="pill pill-green"><Icon name="chat"/>Local replies</span></div>
  {error&&<p className="admin-error" role="alert">{error}</p>}
  <section className={'inbox-layout'+(current&&mobile?' thread-open':'')} aria-label="Enquiry inbox">
   <aside className="conversation-list"><div className="inbox-search"><div className="search-field"><Icon name="search"/><input type="search"
    aria-label="Search enquiries" placeholder="Search enquiries…" value={search} onChange={event=>{setSearch(event.target.value);setSelected(null);}}/></div></div>
    <div className="conversation-items">{filtered.map(item=><button type="button" key={item.id} className={'conversation-item '+(current===item.id?'active':'')}
     onClick={()=>{setSelected(item.id);setMobile(true);}} aria-pressed={current===item.id}><Avatar initial={item.name.slice(0,1)}/><div className="conversation-info"><strong>{item.name}</strong>
      <p>{item.service||'Enquiry'}</p><small>{item.status}</small></div></button>)}
    {!filtered.length&&<p className="empty-state">{load?'Loading enquiries…':'No matching enquiries.'}</p>}
    {cursor!==null&&<button className="btn btn-outline btn-sm" type="button" onClick={()=>void older()}>Load older enquiries</button>}</div>
   </aside>
   <div className="conversation-panel">{current?<InboxThread key={current} id={current} onUpdate={refresh} onBack={()=>setMobile(false)}/>:<p className="empty-state">Select an enquiry to view it.</p>}</div>
  </section>
 </>;
}

export function AdminInvoices({project,actor}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const endpoint='/client-projects/'+recordId(project)+'/invoices';
 useEffect(()=>{
  let active=true;adminApi(endpoint).then(result=>{if(active)setData(result);}).catch(problem=>{if(active)setError(problem.message);});return()=>{active=false;};
 },[endpoint]);
 const refresh=async()=>setData(await adminApi(endpoint));
 return <section className="panel" aria-label="Admin project invoices"><div className="panel-head"><h2>Project invoices</h2></div>
  {error&&<p className="admin-error" role="alert">{error}</p>}
  {!data?<p className="panel-body">Loading invoices…</p>:data.invoices.length?<div className="table-wrap preview-table"><table className="data-table">
   <thead><tr><th scope="col">Milestone</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
   <tbody>{data.invoices.map(item=><tr key={recordId(item)}><td>{item.title}</td><td>{money(item.amount_minor,item.currency)}</td><td><span className="pill pill-gray">{item.status}</span></td></tr>)}</tbody>
  </table></div>:<p className="panel-body">No project invoices yet.</p>}
  <div className="panel-body admin-invoice-form"><h3>Issue milestone invoice</h3><InvoiceIssuance actor={actor} project={recordId(project)} endpoint={endpoint} disabled={!data} onIssued={refresh}/></div>
 </section>;
}
