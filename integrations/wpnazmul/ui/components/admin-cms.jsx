'use client';
import { hubFetch } from '../lib/hub-fetch';



import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './elements';
import { VisualDialog } from './public-preview';
import { WorkspaceError, workspace } from '../lib/workspace-client';

export async function adminLegacy(path,method='GET',data,requestKey){
 const headers=new Headers({Accept:'application/json'});
 if(method!=='GET'){
  const session=await hubFetch('/api/session',{credentials:'same-origin',cache:'no-store',headers});
  const {csrf}=await session.json().catch(()=>({}));
  if(!session.ok||typeof csrf!=='string')throw new WorkspaceError('Could not start a secure administrator request.',session.status);
  headers.set('X-CSRF-TOKEN',csrf);
  headers.set('Content-Type','application/json');
  if(requestKey)headers.set('Idempotency-Key',requestKey);
 }
 const response=await hubFetch(path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),cache:'no-store',credentials:'same-origin'});
 const result=response.status===204?{}:await response.json().catch(()=>null);
 if(!response.ok||!result){
  const fields=Object.values(result?.errors??result?.error?.fields??{}).flat().filter(value=>typeof value==='string');
  throw new WorkspaceError(fields.join(' ')||result?.error?.message||result?.message||'Administrator request failed.',response.status);
 }
 return result;
}

const blank={kind:'services',slug:'',published:true,sort_order:0,data:{title:'',description:'',price:''}};

function Services({entries,refresh}){
 const [selected,setSelected]=useState(null),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const dialog=useRef(null),opener=useRef(null),pending=useRef(false);
 function open(event,item){opener.current=event.currentTarget;setSelected(item);setError('');setNotice('');dialog.current?.showModal();}
 async function save(event){
  event.preventDefault();if(pending.current||!selected)return;
  const form=new FormData(event.currentTarget);
  const payload={kind:'services',slug:String(form.get('slug')).trim(),published:form.get('published')==='yes',sort_order:Number(form.get('sort')),
   data:{...selected.data,title:String(form.get('title')).trim(),description:String(form.get('description')).trim(),price:String(form.get('price')).trim()}};
  pending.current=true;setBusy(true);setError('');setNotice('');
  try{await adminLegacy(selected.id?'/api/admin/entries/'+selected.id:'/api/admin/entries',selected.id?'PUT':'POST',payload);
   await refresh();dialog.current?.close();setNotice('Service saved.');
  }catch(problem){setError(problem.message);}finally{pending.current=false;setBusy(false);}
 }
 return <><div className="ws-title"><div><h1>A good starting point for every idea.</h1><p>Manage the services available to new clients.</p></div>
  <button type="button" className="btn btn-dark btn-sm" onClick={event=>open(event,blank)}><Icon name="plus"/>New service</button></div>
  {notice&&<p role="status">{notice}</p>}
  <section className="panel admin-service-list"><div className="panel-head"><h2>Your services</h2><small>{entries.filter(item=>item.published).length} published</small></div>
  {entries.length?entries.map(item=><div className="service-admin-row" key={item.id}>
   <span className="service-admin-icon"><Icon name="globe"/></span><div><h3>{item.data.title}</h3>{item.data.description&&<p>{item.data.description}</p>}</div>
   <div className="row-controls"><span className="price-text">{item.data.price||'Scoped per project'}</span>
    <span className={'pill '+(item.published?'pill-green':'pill-gray')}>{item.published?'Published':'Draft'}</span>
    <button type="button" className="btn btn-outline btn-sm" aria-label={'Edit '+item.data.title} onClick={event=>open(event,item)}>Edit</button></div>
  </div>):<p className="empty-state">No services are available.</p>}</section>
  <VisualDialog dialogRef={dialog} className="small-modal" title="Shape your service." onClose={()=>{setSelected(null);opener.current?.focus();}}
   footer={<><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button>
    <button type="submit" form="admin-service-editor" className="btn btn-dark btn-sm" disabled={busy}>Save service</button></>}>
   {selected&&<form id="admin-service-editor" className="stack" onSubmit={save} key={selected.id||'new'}>
    <label className="field">Service name<input name="title" required maxLength={190} defaultValue={selected.data.title}/></label>
    <label className="field">URL slug<input name="slug" required maxLength={190} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={selected.slug}/></label>
    <label className="field">Description<textarea name="description" maxLength={10000} defaultValue={selected.data.description||''}/></label>
    <label className="field">Pricing label<input name="price" maxLength={100} defaultValue={selected.data.price||''}/></label>
    <div className="field-grid"><label className="field">Visibility<select name="published" defaultValue={selected.published?'yes':'no'}><option value="yes">Published</option><option value="no">Draft</option></select></label>
     <label className="field">Display order<input name="sort" type="number" min={0} max={10000} required defaultValue={selected.sort_order}/></label></div>
    {error&&<p className="admin-error" role="alert">{error}</p>}
   </form>}
  </VisualDialog>
 </>;
}

const profileFields=[
 ['name','Public name',120],['title','Public title',190],['email','Public contact email',190],['location','Location',120],
 ['availability','Availability',190],['experience','Experience',50],['image','Public image path',500],['seo_title','Search title',100],
 ['intro','Introduction',1000],['about','About',5000],['seo_description','Search description',200],
];

export function AiSettings({profile,mode='profile',keyProvider}){
 const accountOnly=mode==='key', switchOnly=mode==='switch';
 const keyLabel=keyProvider==='gemini'?'Google Gemini':'OpenAI';
 const [saved,setSaved]=useState(null),[provider,setProvider]=useState('openai');
 const [privateProfile,setPrivateProfile]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  workspace('admin','/ai-settings').then(result=>{
   if(active){setSaved(result);setProvider(result.provider);setPrivateProfile(result.private_profile);}
  }).catch(problem=>{if(active)setError(problem.message);});
  return()=>{active=false;};
 },[]);
 async function save(event){
  event.preventDefault();
  const form=event.currentTarget;
  const fields=new FormData(form);
  const key=String(fields.get('api_key')||'').trim();
  const clear=event.nativeEvent.submitter?.value==='clear';
  setBusy(true);setError('');setNotice('');
  try{
   const payload=switchOnly?{provider}:accountOnly?{key_provider:keyProvider,...(clear?{clear_key:true}:key?{api_key:key}:{})}:{private_profile:privateProfile};
   const result=await workspace('admin','/ai-settings','PUT',payload);
   setSaved(result);
   setProvider(result.provider);
   form.reset();
   setNotice(clear?'API key removed.':switchOnly?'Provider selected.':accountOnly?'AI settings saved.':'My PA profile saved.');
  }catch(problem){setError(problem.message);}
  finally{setBusy(false);}
 }
 const stored=saved?.key_status?.[keyProvider] ?? (saved?.provider===keyProvider && saved?.has_key);
 return <section className="panel"><div className="panel-head"><h2>{switchOnly?'AI provider':accountOnly?keyLabel+' API':'My PA profile'}</h2><Icon name="spark"/></div><div className="panel-body">
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!saved&&!error&&<p role="status">Loading AI settings…</p>}
  {saved&&<form className="stack" onSubmit={save}>
   {switchOnly?<><label className="field">AI provider<select value={provider} disabled={busy} onChange={event=>setProvider(event.target.value)}><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select></label>
   <p className="small muted">Only one provider can be selected at a time.</p>
   </>:accountOnly?<>
   <p>{saved.provider===keyProvider?'Selected in Settings':'Available when selected in Settings'}</p>
   <label className="field">{keyLabel} API key<input type="password" name="api_key" autoComplete="off" maxLength={512} placeholder={stored?'********':'Enter API key'}/></label>
   <p className="small muted">{stored?'Key saved. Enter a new key only to replace it.':'Enter the key for this provider.'}</p>
   <p className="small muted">Live AI replies are pending activation.</p>
   </>:<>
   <label className="field">What My PA should know about me
    <textarea rows={6} maxLength={8000} value={privateProfile} disabled={busy} onChange={event=>setPrivateProfile(event.target.value)} placeholder="Add biographical facts, experience, preferences, and updates."/>
   </label>
   {profile?.name && !privateProfile.trim() && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>setPrivateProfile(
    [profile.name,profile.title,profile.location,profile.experience,profile.intro,profile.about].filter(Boolean).join('\n\n').slice(0,8000)
   )}>Start with my published profile</button>}
   <p className="small muted">Private to your workspace. You can add or correct facts any time.</p>
   </>}
   <div className="flex"><button className="btn btn-dark btn-sm" disabled={busy || (switchOnly && provider===saved.provider)}>{switchOnly?'Save provider':accountOnly?'Save API key':'Save My PA profile'}</button>
   {accountOnly&&stored&&<button className="btn btn-outline btn-sm" value="clear" disabled={busy}>Remove key</button>}</div>
  </form>}
 </div></section>;
}

function Settings({profile,refresh,user}){
 const [draft,setDraft]=useState(profile),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function save(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
  try{await adminLegacy('/api/admin/profile','PUT',draft);await refresh();setNotice('Profile saved to the local workspace.');}
  catch(problem){setError(problem.message);}finally{setBusy(false);}
 }
 function social(index,key,value){setDraft(previous=>({...previous,socials:previous.socials.map((item,i)=>i===index?{...item,[key]:value}:item)}));}
 return <><div className="ws-title"><div><h1>Make yourself at home.</h1><p>Manage public business information and search appearance.</p></div></div>
  <div className="settings-layout"><section className="panel"><div className="panel-head"><h2>Business profile</h2></div><div className="panel-body">
   <form className="stack" onSubmit={save}><div className="field-grid">
    {profileFields.map(([key,label,max])=><label className={'field'+(max>=500?' full':'')} key={key}>{label}{
     ['intro','about','seo_description'].includes(key)?<textarea required maxLength={max} value={draft[key]||''} onChange={event=>setDraft({...draft,[key]:event.target.value})}/>:
     <input required type={key==='email'?'email':'text'} maxLength={max} value={draft[key]||''} onChange={event=>setDraft({...draft,[key]:event.target.value})}/>}
    </label>)}</div>
    <fieldset className="admin-socials"><legend>Public links</legend>{(draft.socials||[]).map((item,index)=><div className="field-grid" key={index}>
     <label className="field">Link label<input required maxLength={40} value={item.name} onChange={event=>social(index,'name',event.target.value)}/></label>
     <label className="field">Link URL<input type="url" required maxLength={500} value={item.url} onChange={event=>social(index,'url',event.target.value)}/></label>
    </div>)}</fieldset>
    {error&&<p className="admin-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <button className="btn btn-dark btn-sm" disabled={busy}>Save public settings</button>
   </form></div></section>
   <div className="stack"><AiSettings mode="switch"/><section className="panel"><div className="panel-head"><h2>Public site settings</h2><Icon name="globe"/></div><div className="panel-body">
    <p>These fields are shown on the portfolio and in search metadata.</p><Link href="https://wpnazmul.com/" className="btn btn-outline btn-sm">Preview the portfolio</Link>
   </div></section><section className="panel"><div className="panel-head"><h2>Administrator account</h2></div><div className="panel-body"><p>{user.name}</p><p>{user.email}</p></div></section></div>
  </div>
 </>;
}

export function AdminCms({view,publishedProfile,user}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const endpoint='/api/admin/dashboard?scope='+(view==='services'?'services':'profile');
 async function refresh(){const result=await adminLegacy(endpoint);setData(result);}
 useEffect(()=>{let active=true;adminLegacy(endpoint).then(result=>{if(active)setData(result);}).catch(problem=>{if(active)setError(problem.message);});return()=>{active=false;};},[endpoint]);
 if(!data)return <p role={error?'alert':'status'}>{error||'Loading public content…'}</p>;
 const profile=data.profile;
 const isSample=profile?.image==='/media/portfolio/SyntheticPreview.png' && profile?.name==='Nazmul Hasan (fixture)';
 const settings=profile?.name&&!isSample?profile:publishedProfile||{};
 return view==='services'?<Services entries={data.entries.filter(item=>item.kind==='services')} refresh={refresh}/>:<Settings profile={settings} refresh={refresh} user={user}/>;
}
