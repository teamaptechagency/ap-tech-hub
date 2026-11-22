'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, Icon } from './elements';
import { VisualDialog } from './public-preview';
import { WorkspaceError, recordId, workspace } from '../lib/workspace-client';

const client=(path,method,data,key)=>workspace('client',path,method,data,key);
const admin=(path,method,data,key)=>workspace('admin',path,method,data,key);
const projectBase=realm=>realm==='admin'?'/client-projects/':'/projects/';
const label=value=>value.replaceAll('_',' ');
const date=value=>typeof value==='string'?value.slice(0,10):'';

export function ClientActivity({project,compact=false,realm='client'}) {
  const [state,setState]=useState(null);
  const api=realm==='admin'?admin:client;
  const endpoint=projectBase(realm)+recordId(project);
  useEffect(()=>{
    let active=true;
    Promise.allSettled([api(endpoint+'/activity'),api(endpoint+'/activity-milestones')]).then(results=>{
      if(!active)return;
      const events=results.flatMap(result=>result.status==='fulfilled'?result.value.activity:[]);
      const list=[...new Map(events.map(event=>[event.id,event])).values()].sort((a,b)=>b.created_at.localeCompare(a.created_at));
      setState({list,incomplete:results.some(result=>result.status==='rejected')});
    });
    return()=>{active=false;};
  },[endpoint,api]);
  if(!state)return <p role="status">Loading activity…</p>;
  return <>{state.incomplete&&<p role="alert">Some project activity is unavailable.</p>}
    {state.list.length?<div className="activity-list">{state.list.slice(0,compact?4:25).map(item=><div className="activity-item" key={item.id}>
      <span className="activity-icon"><Icon name="check"/></span><div><strong>{item.label}</strong><p>{item.actor_role?label(item.actor_role):'Project activity'}</p>
      <time dateTime={date(item.created_at)}>{date(item.created_at)}</time></div></div>)}</div>:!state.incomplete&&<p>No project activity yet.</p>}</>;
}

async function messagesAt(api,endpoint) {
  const messages=[];
  let cursor=null;
  for(let turn=0;turn<20;turn++){
    const result=await api(endpoint+'/messages'+(cursor===null?'':'?after_id='+encodeURIComponent(cursor)));
    messages.push(...result.messages);
    if(!result.has_more||result.next_cursor===null||result.next_cursor===cursor)return {messages,readCursor:result.read_cursor,complete:!result.has_more};
    cursor=result.next_cursor;
  }
  return {messages,readCursor:null,complete:false};
}

export function ClientMessages({projects,initial,onRead,embedded=false,realm='client'}) {
  const [search,setSearch]=useState('');
  const [selection,setSelection]=useState(initial||'');
  const [mobileThread,setMobileThread]=useState(Boolean(initial));
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const log=useRef(null);
  const stick=useRef(true);
  const operation=useRef(null);
  const intent=useRef(null);
  const version=useRef(0);
  const current=projects.find(item=>recordId(item)===selection)||projects[0];
  const selected=current?recordId(current):'';
  const api=realm==='admin'?admin:client;
  const endpoint=selected?projectBase(realm)+selected:'';
  const messages=data?.endpoint===endpoint?data.messages:[];
  const readCursor=data?.endpoint===endpoint?data.readCursor:0;
  useEffect(()=>{
    if(!endpoint)return;
    let active=true, pending=false;
    const load=async()=>{
      if(pending||operation.current||document.hidden)return;
      pending=true;
      const request=++version.current;
      try{const result=await messagesAt(api,endpoint);if(active&&request===version.current)setData({...result,endpoint});}
      catch(problem){if(active&&request===version.current)setError(problem.message);}
      finally{pending=false;}
    };
    load();const timer=setInterval(load,9000);
    return()=>{active=false;clearInterval(timer);};
  },[endpoint,api]);
  useEffect(()=>{if(stick.current&&log.current)log.current.scrollTop=log.current.scrollHeight;},[data]);
  async function run(fn) {
    if(operation.current)return;
    operation.current=endpoint;
    version.current++;
    setBusy(true);setError('');setNotice('');
    try{await fn();}catch(problem){setError(problem.message);}finally{operation.current=null;setBusy(false);}
  }
  function send(event){
    event.preventDefault();
    const form=event.currentTarget, body=String(new FormData(form).get('body')).trim();
    if(!body||!endpoint)return;
    const signature=endpoint+'|'+body;
    if(intent.current?.signature!==signature)intent.current={signature,key:crypto.randomUUID()};
    void run(async()=>{
      try{await api(endpoint+'/messages','POST',{body},intent.current.key);}
      catch(problem){if(problem instanceof WorkspaceError&&problem.status<500&&![419,429].includes(problem.status))intent.current=null;throw problem;}
      intent.current=null;form.reset();stick.current=true;
      const result=await messagesAt(api,endpoint);
      setData({...result,endpoint});
      setNotice('Message sent.');
    });
  }
  const filtered=projects.filter(item=>item.title.toLowerCase().includes(search.trim().toLowerCase()));
  return <>{!embedded&&<div className="ws-title"><div><h1>Let’s keep the conversation going.</h1><p>Your messages, project details, and feedback, together.</p></div></div>}
    {error&&<p role="alert" className="client-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <section className={'inbox-layout'+(mobileThread&&current?' thread-open':'')}>
      <aside className="conversation-list"><div className="inbox-search"><div className="search-field"><Icon name="search"/>
        <input type="search" aria-label="Search conversations" placeholder="Search conversations…" value={search} onChange={event=>setSearch(event.target.value)}/></div></div>
        <div className="conversation-items">{filtered.length?filtered.map(item=><button key={recordId(item)} type="button" className={'conversation-item '+(recordId(item)===selected?'active':'')}
          disabled={busy} aria-pressed={recordId(item)===selected} onClick={()=>{setSelection(recordId(item));setMobileThread(true);setError('');setNotice('');stick.current=true;}}>
          <Avatar initial={item.title.slice(0,1)}/><div className="conversation-info"><strong>{item.title}</strong><p>{item.service}</p></div>
          {item.unread_count>0&&<span className="nav-count">{item.unread_count}</span>}</button>):<p className="empty-state">No matching project conversations.</p>}</div>
      </aside>
      <div className="conversation-panel">{current?<><header className="conversation-head">
        <button className="icon-btn mobile-conversation-back" type="button" aria-label="Back to conversations" onClick={()=>setMobileThread(false)}><Icon name="back"/></button>
        <Avatar initial={current.title.slice(0,1)}/><div><strong>{current.title}</strong><p>{current.service}</p></div><div className="conversation-meta"><span className="pill pill-green">{label(current.status)}</span></div>
      </header><div className="message-scroll" role="log" aria-label="Project messages" tabIndex={0} ref={log} onScroll={event=>{const node=event.currentTarget;stick.current=node.scrollHeight-node.scrollTop-node.clientHeight<40;}}>
        {data?.endpoint!==endpoint?<p>Loading conversation…</p>:messages.length?messages.map(message=><div key={message.id} className={'message-group'+(message.mine?' mine':'')}>
          <div className="message-bubble"><strong>{message.mine?'You':message.sender_name||'Project team'}</strong><p className="client-pre">{message.body}</p>
          {message.created_at&&<time dateTime={date(message.created_at)}>{date(message.created_at)}</time>}</div></div>):<p>No messages yet.</p>}
      </div>
      {data?.complete===false&&<p className="tiny muted">Only the first portion of this conversation is shown.</p>}
      <form className="message-compose" key={selected} onSubmit={send}><label className="sr-only" htmlFor="client-message">Message</label>
        <textarea id="client-message" name="body" required maxLength={4000} placeholder="Write a message…"/>
        <div className="compose-toolbar">
          {messages.at(-1)?.id>readCursor&&<button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>void run(async()=>{
            const result=await api(endpoint+'/read-cursor','PUT',{message_id:messages.at(-1).id});
            setData(previous=>({...previous,readCursor:result.read_cursor}));await onRead();setNotice('Messages marked read.');
          })}>Mark displayed messages read</button>}
          <button className="btn btn-dark btn-sm" disabled={busy}>Send message <Icon name="send"/></button>
        </div>
      </form></>:<p className="empty-state">Select a project to read its conversation.</p>}</div>
    </section></>;
}

const currency=(amount,code)=>new Intl.NumberFormat('en',{style:'currency',currency:code}).format(amount/100);

export function ClientInvoices({projects}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[detail,setDetail]=useState(null),[busy,setBusy]=useState(false);
  const dialog=useRef(null), opener=useRef(null);
  const ids=projects.map(recordId).join(',');
  useEffect(()=>{
    let active=true;
    const requests=ids?ids.split(',').map(id=>client('/projects/'+id+'/invoices')):[];
    Promise.allSettled(requests).then(results=>{
      if(!active)return;
      setData(results.flatMap(result=>result.status==='fulfilled'?result.value.invoices:[]));
      if(results.some(result=>result.status==='rejected'))setError('Some project invoices are unavailable.');
    });
    return()=>{active=false;};
  },[ids]);
  useEffect(()=>{if(detail&&!dialog.current?.open)dialog.current?.showModal();},[detail]);
  async function open(event,item){
    opener.current=event.currentTarget;setBusy(true);setError('');
    try{const record=await client('/invoices/'+recordId(item));setDetail(record.invoice||record);}
    catch(problem){setError(problem.message);}finally{setBusy(false);}
  }
  return <><div className="ws-title"><div><h1>Clear projects. Clear invoices.</h1><p>Your project’s invoice history.</p></div></div>
    {error&&<p role="alert" className="client-error">{error}</p>}
    <section className="panel"><div className="panel-head"><h2>Your invoices</h2><span className="pill pill-gray">{data?.length??'…'} records</span></div>
      {data?data.length?<div className="table-wrap preview-table"><table className="data-table"><thead><tr><th>Invoice</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{data.map(item=><tr key={recordId(item)}><td><strong>{item.title}</strong><div className="subtext">{date(item.created_at)}</div></td>
        <td>{currency(item.amount_minor,item.currency)}</td><td><span className={'pill '+(item.status==='paid'?'pill-green':'pill-gray')}>{label(item.status)}</span></td>
        <td><button type="button" className="table-action" disabled={busy} onClick={event=>void open(event,item)}>View invoice</button></td></tr>)}</tbody></table></div>:
        <p className="empty-state">No invoices yet. Project invoices will appear here.</p>:<p className="panel-body" role="status">Loading invoices…</p>}
    </section>
    <VisualDialog dialogRef={dialog} title="A clear record of the work." className="small-modal" onClose={()=>{setDetail(null);opener.current?.focus();}}
      footer={<button type="button" className="btn btn-dark btn-sm" onClick={()=>dialog.current?.close()}>Done</button>}>
      {detail&&<><div className="invoice-heading"><div><h3>Invoice</h3><p>{date(detail.created_at)}</p></div><span className="pill pill-gray">{label(detail.status)}</span></div>
        <div className="between"><p>{detail.title}</p><strong>{currency(detail.amount_minor,detail.currency)}</strong></div>
        <div className="invoice-total"><span>Total ({detail.currency})</span><span>{currency(detail.amount_minor,detail.currency)}</span></div></>}
    </VisualDialog>
  </>;
}
