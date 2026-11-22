'use client';
import { hubFetch } from '../lib/hub-fetch';



import { useRef, useState } from 'react';
import { ActionLink, assets, Icon } from './elements';
import { AssistantPreview, PublicFooter, PublicHeader } from './public-preview';

const blank = { name:'',email:'',title:'',brief:'',website:'',company:'',budget:'',timeline:'Flexible' };
const fields = [
  ['name','Your name *','text','Your full name'],['email','Email address *','email','you@company.com'],
  ['title','Give your project a name *','text','e.g. A new website for my studio'],
  ['brief','What would you like to build or improve? *','textarea','Tell me about your business, your goals, and any features you have in mind…'],
  ['website','Existing website (optional)','url','https://yourwebsite.com'],['company','Company (optional)','text','Your business or team'],
  ['budget','Your budget range','select',['','Under $300','$300–$750','$750–$1,500','$1,500+','Let’s discuss']],
  ['timeline','When would you like to start?','select',['Flexible','As soon as possible','Within a month','In 1–3 months']],
];

export function RequestPreview({ services, profile, initialSlug }) {
  const [step,setStep] = useState(1);
  const [service,setService] = useState(() => Math.max(0, services.findIndex(item=>item.slug===initialSlug)));
  const [draft,setDraft] = useState(blank);
  const [files,setFiles] = useState([]);
  const [notice,setNotice] = useState('');
  const [sending,setSending]=useState(false);
  const [receipt,setReceipt]=useState(null);
  const [retryExact,setRetryExact]=useState(false);
  const [referenceError,setReferenceError]=useState('');
  const key=useRef(null), inFlight=useRef(false);
  const active=services[service];
  const message=[draft.title.trim() && 'Project: '+draft.title.trim(),draft.budget&&'Budget: '+draft.budget,'Timeline: '+draft.timeline,draft.website&&'Existing website: '+draft.website.trim(),draft.brief.trim()].filter(Boolean).join('\n\n');
  async function send(){
    if(inFlight.current||!active)return;
    inFlight.current=true;setSending(true);setNotice('');
    try{
      const session=await hubFetch('/api/session',{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'});
      const auth=await session.json();
      if(!session.ok||typeof auth.csrf!=='string')throw new Error('Could not start a secure request. Try again.');
      const data={name:draft.name.trim(),email:draft.email.trim(),company:draft.company.trim(),service:active.title,message,website:''};
      const headers=new Headers({Accept:'application/json','X-CSRF-TOKEN':auth.csrf});
      let route='/api/contact', body;
      if(files.length){
        route='/api/v1/enquiries/references';body=new FormData();
        for(const [field,value] of Object.entries(data))body.append(field,value);
        files.forEach(file=>body.append('references[]',file));
        key.current??=crypto.randomUUID();headers.set('Idempotency-Key',key.current);
      }else{headers.set('Content-Type','application/json');body=JSON.stringify({...data,company:data.company||null});}
      const response=await hubFetch(route,{method:'POST',credentials:'same-origin',headers,body,cache:'no-store'});
      const result=await response.json().catch(()=>null);
      if([400,413,415,422].includes(response.status)){key.current=null;setRetryExact(false);}
      if(response.status!==201||typeof result?.message!=='string'||(files.length&&result.reference_count!==files.length)){
        const issues=Object.values(result?.error?.fields??result?.errors??{}).flat().filter(value=>typeof value==='string');
        throw new Error(issues.join(' ')||result?.error?.message||(response.status===429?'Too many requests. Try again later.':'Receipt could not be confirmed.'));
      }
      key.current=null;setRetryExact(false);setReceipt({count:files.length});setFiles([]);setDraft(blank);
    }catch(error){
      if(key.current)setRetryExact(true);
      setNotice(error instanceof TypeError?'The response was interrupted. Use the indicated retry action or confirm receipt before sending again.':error.message);
    }finally{inFlight.current=false;setSending(false);}
  }
  function pick(next){
    const picked=[...files,...next];
    if(picked.length>3){setReferenceError('Choose up to three reference files.');return;}
    if(picked.some(file=>!/\.(?:png|jpe?g|txt)$/i.test(file.name)||!file.size||file.size>512*1024)){setReferenceError('Use nonempty JPEG, PNG or UTF-8 text files up to 512 KiB each.');return;}
    setReferenceError('');setFiles(picked);
  }
  function move(next) { setStep(next); setNotice(''); document.querySelector('#visual-request-top')?.scrollIntoView({ block:'start',behavior:'instant' }); }
  return <><PublicHeader /><main id="main" className="container page-fade">
  {receipt ? <section className="success-page">
    <div className="success-mark"><Icon name="check" size={30} /></div><span className="pill pill-green">Enquiry received</span>
      <h1>Your next chapter starts here.</h1><p>Your project enquiry has been received.</p>{receipt.count>0&&<p>{receipt.count} reference {receipt.count===1?'file':'files'} received.</p>}
      <div className="actions"><ActionLink href="https://wpnazmul.com/">Back to the website</ActionLink></div></section> : <>
    <div className="page-hero" id="visual-request-top"><ActionLink href="https://wpnazmul.com/" className="back-link"><Icon name="back" />Back to the website</ActionLink>
      <h1>Let’s give your idea a good start.</h1><p>A few details now. A clear plan for what comes next.</p></div>
    <div className="order-layout"><section className="order-panel">
      <div className="order-stepper" aria-label="Project request steps">{['Your service','Project details','Review & send'].map((label,index) =>
        <div key={label} className="visual-step-group"><div className={'step '+(step===index+1?'active':step>index+1?'done':'')} aria-current={step===index+1?'step':undefined}>
          <span>{step>index+1?<Icon name="check"/>:index+1}</span>{label}</div>{index<2&&<div className="step-line"/>}</div>)}</div>
      {step===1 && <><h2>What can I help you with?</h2><p className="muted">Choose the closest match. We’ll work out the details together.</p>
        <div className="service-options">{services.map((item,index) => <button key={item.short} type="button" className={'service-option '+(index===service?'selected':'')}
          aria-pressed={index===service} onClick={() => setService(index)}><span className="service-option-icon"><Icon name={item.icon} /></span>
          <strong>{item.short}</strong><small>{item.price}</small></button>)}</div>
        <div className="order-buttons"><span className="tiny muted">No payment needed to enquire.</span><button type="button" className="btn btn-dark" disabled={!active} onClick={()=>move(2)}>Continue <Icon name="arrow" /></button></div>
      </>}
      {step===2 && <><h2>Tell me a little about your idea.</h2><p className="muted">You don’t need a perfect brief. A good starting point is enough.</p>
        <form onSubmit={event => { event.preventDefault(); if(message.length>3000){setNotice('Shorten the project details before continuing.');return;} if(draft.website&&!/^https?:\/\//i.test(draft.website.trim())){setNotice('Use an http or https website address.');return;} move(3); }}><div className="field-grid">
          {fields.map(([key,label,type,placeholder],index) => <label key={key} className={'field'+(index===2||index===3?' full':'')}><span>{label}</span>
            {type==='textarea' ? <textarea required minLength={15} value={draft[key]} placeholder={placeholder} onChange={event=>setDraft({...draft,[key]:event.target.value})}/>
              : type==='select' ? <select value={draft[key]} onChange={event=>setDraft({...draft,[key]:event.target.value})}>{placeholder.map(option=><option key={option} value={option}>{option || 'Select a range (optional)'}</option>)}</select>
              : <input required={index<3} type={type} value={draft[key]} placeholder={placeholder} onChange={event=>setDraft({...draft,[key]:event.target.value})}/>}
          </label>)}
          <div className="field full"><label>Reference files (optional)<input type="file" multiple accept=".png,.jpg,.jpeg,.txt" onChange={event=>{pick(Array.from(event.target.files||[]));event.target.value='';}}/></label>
<p className="tiny muted">Up to three JPEG, PNG or text files at 512 KiB each.</p>
{referenceError&&<p role="alert">{referenceError}</p>}
{files.length>0&&<ul>{files.map((file,index)=><li key={index}>{file.name} <button type="button" className="link-btn" aria-label={'Remove '+file.name} onClick={()=>{setFiles(files.filter((_,i)=>i!==index));setReferenceError('');}}>Remove</button></li>)}</ul>}</div>
        </div>{notice&&<p role="alert">{notice}</p>}<div className="order-buttons"><button type="button" className="btn btn-ghost" onClick={()=>move(1)}>Back</button><button className="btn btn-dark" type="submit">Review your request <Icon name="arrow" /></button></div></form>
      </>}
      {step===3 && <><h2>Looking good. Ready to send?</h2><p className="muted">Check the details below. Your final quote comes after we review the scope.</p>
        {[['Service',active.short],['Project',draft.title],['Your brief',draft.brief],['Contact',draft.name+' · '+draft.email],['Company',draft.company||'Not specified'],['Website',draft.website||'Not provided'],['Budget',draft.budget||'To be discussed'],['Timeline',draft.timeline],...(files.length?[['References',files.map(file=>file.name).join(', ')]]:[])].map(([label,value])=><div className="review-block" key={label}><span>{label}</span><p>{value}</p></div>)}
        <div className="form-note"><Icon name="check" />This is a project enquiry. No payment or commitment is made.</div>
        <div className="order-buttons"><button type="button" className="btn btn-ghost" disabled={sending||retryExact} onClick={()=>move(2)}>Edit details</button><button type="button" className="btn btn-dark" disabled={sending} onClick={send}>{sending?'Sending…':retryExact?'Retry enquiry':'Submit project request'}</button></div>
        {notice && <p role="alert">{notice}</p>}{retryExact&&<p>Keep this page open. Retry sends the same request and reference files.</p>}
      </>}
    </section><aside className="order-summary"><h3>Your project, thoughtfully built.</h3><span className="summary-icon"><Icon name={active?.icon || "globe"} /></span>
      <p className="strong small">{active?.short || "Choose a published service"}</p><p className="small muted" style={{marginTop:8}}>{active?.copy}</p><div className="summary-price">{active?.price || (active ? "Scoped for your project" : "")}</div>
      <p className="tiny muted" style={{marginTop:5}}>Final scope and price confirmed together.</p><ul className="check-list">{['A clear scope before we begin','Fixed pricing, agreed in advance','Your own project workspace','Direct, thoughtful communication'].map(item=><li key={item}><Icon name="check"/>{item}</li>)}</ul>
      <div className="flex"><img src={assets+'nazmul-portrait.webp'} width={42} height={42} alt="" /><div><strong className="tiny">You’ll work with {profile.name}</strong><p className="tiny muted">A real person behind your project.</p></div></div>
    </aside></div>
  </>}</main><PublicFooter/><AssistantPreview/></>;
}
