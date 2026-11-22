'use client';

import Link from 'next/link';
import { WorkspaceLogin } from './workspace-login';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActionLink, Avatar, Icon, Logo } from './elements';
import { WorkspaceError, recordId, workspace } from '../lib/workspace-client';
import { ClientProfile, ProjectFiles, ProjectQuotes, DeliveryReview } from './workspace-project-panels';
import { ClientMessages, ClientInvoices, ClientActivity } from './client-panels';

const nav = [['overview','grid','Overview'],['projects','folder','My projects'],['messages','chat','Messages'],
  ['files','file','Files'],['invoices','receipt','Invoices'],['settings','settings','Settings']];
const phases = ['new','quoted','in_progress','review','completed'];
const labels = {new:'Awaiting review',quoted:'Quote shared',in_progress:'In progress',review:'Client review',completed:'Complete',cancelled:'Cancelled'};
const projectUrl = item => '/client/project/'+ recordId(item);
const ClientContext = createContext(null);
export const clientApi = (path,method,data,key) => workspace('client',path,method,data,key);

function Title({title,copy,children}) { return <div className="ws-title"><div><h1>{title}</h1><p>{copy}</p></div>{children}</div>; }
export function Empty({title,copy}) { return <div className="empty-state"><Icon name="folder" size={28}/><h3>{title}</h3><p>{copy}</p></div>; }
function Status({value}) { const color=value==='review'?'amber':value==='in_progress'?'blue':value==='completed'?'green':'gray';return <span className={'pill pill-'+color}>{labels[value]||value}</span>; }
function Progress({value}) { const count=phases.indexOf(value)+1;return <div className="progress" role="progressbar" aria-label="Project stage" aria-valuemin={0} aria-valuemax={5} aria-valuenow={count}><span style={{width:count*20+'%'}}/></div>; }
function ActionHeader() {return <ActionLink href="/client/projects?new=1" className="btn btn-dark btn-sm"><Icon name="plus"/>New project</ActionLink>;}

export function ClientProvider({children}) {
  const [state,setState]=useState({user:undefined,projects:[],cursor:null,error:''});
  const router=useRouter();
  const generation=useRef(0);
  const loadingMore=useRef(false);
  const [paging,setPaging]=useState(false);
  const refresh=useCallback(async()=>{
    const guard=++generation.current;
    try{
      const {user}=await clientApi('/session');
      const data=user?await clientApi('/projects'):{projects:[]};
      if(guard===generation.current)setState({user,projects:data.projects,cursor:data.has_more?data.next_cursor:null,error:''});
    }catch(error){
      if(guard===generation.current)setState(current=>({...current,error:error.message}));
      throw error;
    }
  },[]);
  useEffect(()=>{refresh().catch(()=>{});return()=>{generation.current++;};},[refresh]);
  async function loadMore(){
    if(loadingMore.current||!state.cursor)return;
    loadingMore.current=true;setPaging(true);
    const guard=generation.current;
    try{
      const data=await clientApi('/projects?before_id='+encodeURIComponent(state.cursor));
      if(guard===generation.current)setState(current=>({...current,projects:[...new Map([...current.projects,...data.projects].map(item=>[recordId(item),item])).values()],cursor:data.has_more?data.next_cursor:null,error:''}));
    }catch(problem){if(guard===generation.current)setState(current=>({...current,error:problem.message}));}
    finally{loadingMore.current=false;setPaging(false);}
  }
  const logout=async()=>{
    try{await clientApi('/logout','POST');generation.current++;setState({user:null,projects:[],cursor:null,error:''});router.replace('/client');}
    catch(error){setState(current=>({...current,error:error.message}));}
  };
  if(state.user===undefined)return <main id="main" className="container section">
    <h1>Client workspace</h1>{state.error?<><p role="alert">{state.error}</p><button className="btn btn-outline" onClick={()=>refresh().catch(()=>{})}>Retry session</button></>:<p role="status">Checking your session…</p>}
  </main>;
  if(!state.user)return <SignIn refresh={refresh}/>;
  return <ClientContext.Provider value={{...state,refresh,logout,loadMore,paging,setName:name=>setState(current=>({...current,user:{...current.user,name}}))}}>{children}</ClientContext.Provider>;
}

function SignIn({refresh}) {
  const [register,setRegister]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function signIn(event){
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try{await clientApi(register?'/register':'/login','POST',Object.fromEntries(new FormData(event.currentTarget)));await refresh();}
    catch(problem){setError(problem.message);}finally{setBusy(false);}
  }
  return <WorkspaceLogin key={String(register)} register={register} busy={busy} error={error} onSubmit={signIn} onToggleRegister={()=>{setRegister(!register);setError('');}}/>;
}

function Frame({view,children}) {
  const {user,error,logout,projects}=useContext(ClientContext);
  const [sidebar,setSidebar]=useState(false);
  const [signingOut,setSigningOut]=useState(false);
  const menu=useRef(null);
  const label=nav.find(([id])=>id===view)?.[2]||'Project details';
  const initial=user.name?.slice(0,1).toUpperCase()||'C';
  const unread=projects.reduce((sum,item)=>sum+(item.unread_count||0),0);
  return <div className={'workspace'+(sidebar?' sidebar-open':'')} onKeyDown={event=>{if(event.key==='Escape'&&sidebar){setSidebar(false);menu.current?.focus();}}}>
    <button className="mobile-nav-shade" type="button" aria-label="Close sidebar" onClick={()=>{setSidebar(false);menu.current?.focus();}}/>
    <aside className="workspace-sidebar" id="client-sidebar"><Logo className="ws-brand" width={170}/><p className="workspace-label">Your workspace</p>
      <nav className="workspace-nav" aria-label="Client navigation">{nav.map(([id,ico,text])=><Link href={'/client/'+id}
        className={id===view||view==='project'&&id==='projects'?'active':''} aria-current={id===view?'page':undefined} key={id} onClick={()=>setSidebar(false)}>
        <Icon name={ico}/>{text}{id==='messages'&&unread>0&&<span className="nav-count">{unread}</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><Icon name="chat"/><strong>Good things start with a chat.</strong>
        <p>Have a project question? Keep the conversation in your workspace.</p><ActionLink className="btn btn-outline btn-sm btn-full" href="/client/messages">Message Nazmul</ActionLink></div>
      <div className="sidebar-profile"><Avatar initial={initial} className="purple"/><div><strong>{user.name}</strong><small>Client account</small></div></div></div>
    </aside>
    <header className="ws-topbar"><div className="screen-title-row"><button type="button" className="icon-btn ws-mobile-toggle" ref={menu}
      aria-expanded={sidebar} aria-controls="client-sidebar" aria-label="Open workspace menu" onClick={()=>setSidebar(true)}><Icon name="menu"/></button>
      <div className="ws-breadcrumb"><span>Workspace</span><span aria-hidden="true">›</span><strong>{label}</strong></div></div>
      <div className="ws-toolbar"><Link href="https://wpnazmul.com/"><Icon name="globe"/>View website</Link><button className="btn btn-outline btn-sm" type="button" disabled={signingOut}
        onClick={async()=>{setSigningOut(true);try{await logout();}finally{setSigningOut(false);}}}>Sign out</button><Avatar initial={initial} className="purple"/></div>
    </header>
    <div className="notice-strip"><span className="flex"><Icon name="layout"/>Your client workspace</span></div>
    <main id="main" className="ws-content page-fade">{error&&<p role="alert" className="client-error">{error}</p>}{children}</main>
  </div>;
}

function ProjectRows({items}) {
  return items.length?items.map(item=><div className="project-row" key={recordId(item)}><div className="flex"><span className="project-logo"><Icon name="globe"/></span><div>
    <h3><Link href={projectUrl(item)}>{item.title}</Link></h3><p>{item.service}</p></div></div><div className="row-progress"><small>{labels[item.status]||item.status}</small><Progress value={item.status}/></div>
    <Status value={item.status}/><Link href={projectUrl(item)} className="icon-btn" aria-label={'Open '+item.title}><Icon name="arrow"/></Link></div>):
    <Empty title="Something good starts here." copy="Your projects will appear here." />;
}

function Overview({projects,user}) {
  const active=projects.filter(item=>!['completed','cancelled'].includes(item.status));
  const featured=active.find(item=>item.status==='review')||active[0]||projects[0];
  const unread=projects.reduce((sum,item)=>sum+(item.unread_count||0),0);
  return <><Title title={'Welcome back, '+user.name+'.'} copy="A little clarity. A lot of progress."><ActionHeader/></Title>
    <div className="stats-grid three">{[['Active projects',active.length,'Good things in progress','folder'],['New messages',unread,'Keep the conversation going','chat'],['Completed projects',projects.filter(item=>item.status==='completed').length,'Finished project work','check']].map(([label,value,detail,icon],index)=>
      <div className={'stat-card'+(index===0?' highlight':'')} key={label}><div className="stat-label">{label}<Icon name={icon}/></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>)}</div>
    <div className="dashboard-grid"><section className="panel">{featured?<div className="project-spotlight"><div className="project-type"><span className="project-logo"><Icon name="globe"/></span>
      <Status value={featured.status}/></div><h2>{featured.title}</h2><p>{featured.service}</p><div className="progress-meta"><span>Project progress</span><strong>{labels[featured.status]}</strong></div><Progress value={featured.status}/>
      <div className="milestone-note"><Icon name="flag"/><div><strong>{featured.status==='review'?'Your feedback makes it better.':'Follow your latest project.'}</strong><p>Open the project for details and activity.</p></div></div>
      <ActionLink href={projectUrl(featured)} className="btn btn-dark btn-sm">View project</ActionLink></div>:<Empty title="No projects yet" copy="Start your next project to see progress here."/>}</section>
      <section className="panel"><div className="panel-head"><h2>Recent activity</h2><small>Your project updates</small></div><div className="panel-body">
        {featured?<ClientActivity project={featured} compact/>:<Empty title="No activity yet" copy="Project updates will appear here."/>}
      </div></section></div>
    <section className="panel"><div className="panel-head"><h2>Your projects</h2><Link className="link-btn" href="/client/projects">View all projects</Link></div><ProjectRows items={projects.slice(0,3)}/></section>
  </>;
}

function Projects({projects,showNew,refresh,cursor,loadMore,paging}) {
  const [query,setQuery]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const key=useRef(null);
  async function create(event){
    event.preventDefault();if(busy)return;
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form));
    if(!data.budget.trim())delete data.budget;
    const signature=JSON.stringify(data);if(key.current?.signature!==signature)key.current={signature,key:crypto.randomUUID()};
    setBusy(true);setError('');setNotice('');
    try{await clientApi('/projects','POST',data,key.current.key);key.current=null;form.reset();await refresh();setNotice('Project created.');}
    catch(problem){if(problem instanceof WorkspaceError&&problem.status<500&&![419,429].includes(problem.status))key.current=null;setError(problem.message);}finally{setBusy(false);}
  }
  const matching=projects.filter(item=>item.title.toLowerCase().includes(query.trim().toLowerCase()));
  return <><Title title="Your projects. All together." copy="From the first hello to the final handover."><ActionHeader/></Title>
    <section className="panel"><div className="panel-head"><h2>All projects</h2><span className="pill pill-gray">{matching.length} records</span></div>
      <div className="panel-body"><label className="field">Search projects<input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
      <ProjectRows items={matching}/>{cursor&&<div className="panel-body"><button type="button" className="btn btn-outline" disabled={paging} onClick={()=>void loadMore()}>Load older projects</button></div>}</section>
    {showNew&&<section className="panel client-form-panel"><div className="panel-head"><h2>Start a project</h2></div><div className="panel-body"><form className="stack" onSubmit={create}>
      <label className="field">Title<input name="title" maxLength={180} required/></label><label className="field">Service<input name="service" maxLength={120} required/></label>
      <label className="field">Brief<textarea name="brief" maxLength={10000} required/></label><label className="field">Budget indication<input name="budget" maxLength={120}/></label>
      {notice&&<p role="status">{notice}</p>}{error&&<p className="client-error" role="alert">{error}</p>}<button className="btn btn-dark" disabled={busy}>Create project</button>
    </form></div></section>}
  </>;
}

function ProjectDetail({record,refresh}) {
  const [tab,setTab]=useState('Overview');
  const [detail,setDetail]=useState(null);
  const [error,setError]=useState('');
  const endpoint='/projects/'+encodeURIComponent(record||'');
  useEffect(()=>{
    let current=true;
    clientApi(endpoint).then(data=>{if(current)setDetail(data.project||data);}).catch(problem=>{if(current)setError(problem.status===404?'unavailable':problem.message);});
    return()=>{current=false;};
  },[endpoint]);
  if(error==='unavailable')return <><Title title="Project unavailable" copy="This project is not available in your workspace."/><ActionLink href="/client/projects">Back to my projects</ActionLink></>;
  if(!detail)return <p role={error?'alert':'status'}>{error||'Loading project…'}</p>;
  const reload=async()=>{const data=await clientApi(endpoint);setDetail(data.project||data);await refresh();};
  const step=phases.indexOf(detail.status);
  return <><ActionLink className="back-link" href="/client/projects"><Icon name="back"/>My projects</ActionLink>
    <div className="project-detail-head"><span className="project-logo"><Icon name="globe"/></span><div><h1>{detail.title}</h1><p>{detail.service}</p></div><Status value={detail.status}/></div>
    <div className="detail-tabs" role="group" aria-label="Project detail">{['Overview','Messages','Files','Activity'].map(name=><button type="button" className={tab===name?'active':''} aria-pressed={tab===name} key={name} onClick={()=>setTab(name)}>{name}</button>)}</div>
    {tab==='Messages'?<ClientMessages projects={[detail]} initial={record} onRead={refresh} embedded/>:
     tab==='Files'?<ProjectFiles realm="client" path={endpoint}/>:tab==='Activity'?<section className="panel"><div className="panel-head"><h2>Project history</h2></div><div className="panel-body"><ClientActivity project={detail}/></div></section>:
     <div className="detail-grid"><div className="stack"><section className="panel"><div className="panel-head"><h2>From idea to delivery</h2></div><div className="milestones"><Progress value={detail.status}/>
       {['Brief received','Quote shared','Design & development','Your review','Final delivery'].map((label,index)=><div className={'milestone'+(index<=step?' done':'')} key={label}>
         <span className="check-circle">{index<step||detail.status==='completed'?<Icon name="check"/>:index===step?<Icon name="clock"/>:null}</span><div><h4>{label}</h4></div>
         <span className="milestone-state">{index<step||detail.status==='completed'?'Complete':index===step?'Current':'Upcoming'}</span></div>)}</div></section>
       <DeliveryReview realm="client" path={endpoint} projectStatus={detail.status} onDecision={reload}/></div>
       <div className="stack"><section className="panel"><div className="panel-head"><h2>Project details</h2></div><div className="panel-body"><p className="client-pre">{detail.brief}</p>
         {detail.budget&&<p>Budget indication: {detail.budget}</p>}{detail.due_date&&<p>Due: {detail.due_date.slice(0,10)}</p>}</div></section>
         <ProjectQuotes realm="client" path={endpoint}/></div>
     </div>}
  </>;
}

function FileView({projects}) {
  const [id,setId]=useState('');
  const selected=projects.find(item=>recordId(item)===id)||projects[0];
  return <><Title title="The details belong together." copy="Briefs, references, and project files, within easy reach."/>
    {selected?<><label className="field client-project-picker">Project<select value={recordId(selected)} onChange={event=>setId(event.target.value)}>
      {projects.map(item=><option value={recordId(item)} key={recordId(item)}>{item.title}</option>)}</select></label>
      <ProjectFiles key={recordId(selected)} realm="client" path={'/projects/'+recordId(selected)}/></>:<Empty title="No shared files" copy="Attachments will appear when a project is available."/>}
  </>;
}

export function ClientWorkspace({view,project,showNew}) {
  const {projects,user,refresh,setName,cursor,loadMore,paging}=useContext(ClientContext);
  let screen;
  switch(view){
    case 'projects': screen=<Projects projects={projects} refresh={refresh} showNew={showNew} cursor={cursor} loadMore={loadMore} paging={paging}/>;break;
    case 'project': screen=<ProjectDetail key={project} record={project} refresh={refresh}/>;break;
    case 'messages': screen=<ClientMessages projects={projects} onRead={refresh}/>;break;
    case 'files': screen=<FileView projects={projects}/>;break;
    case 'invoices': screen=<ClientInvoices projects={projects}/>;break;
    case 'settings': screen=<ClientProfile email={user.email} onSaved={setName}/>;break;
    default: screen=<Overview projects={projects} user={user}/>;
  }
  return <Frame key={view} view={view}>{screen}</Frame>;
}
