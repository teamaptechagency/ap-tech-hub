import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const files={content:'content.json',projects:'case-studies.json',designs:'portfolio-designs.json',reviews:'reviews.json'};
const root=()=>path.join(process.env.AP_DATA||'/var/lib/aptech-agency','site-editor');
function read(name,fallback=null){try{return JSON.parse(fs.readFileSync(path.join(root(),name),'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
function write(name,data){fs.mkdirSync(root(),{recursive:true,mode:0o700});const p=path.join(root(),name),tmp=p+'.'+crypto.randomUUID();fs.writeFileSync(tmp,JSON.stringify(data),{mode:0o600,flag:'wx'});fs.renameSync(tmp,p);}
function state(){let s=read('draft.json');if(!s){s={version:1,draft:Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join('/opt/aptech-site-builder/src',f),'utf8'))]))};write('draft.json',s);}const job=read('request.json'),result=read('result.json');return {...s,publish:job&&job.id!==result?.id?{state:'queued',version:job.version}:result};}
export function validateSiteDraft(d){
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).sort().join(',')!=='content,designs,projects,reviews'||!Array.isArray(d.content?.services)||!d.content.services.length||!d.content.services.some(s=>s.slug==='ai-automation')||!Array.isArray(d.projects)||!Array.isArray(d.designs)||!Array.isArray(d.reviews?.profiles)||!Array.isArray(d.reviews?.reviews))throw Error('Keep the website structure and at least the AI automation service.');
 function check(v,depth=0){if(depth>18)throw Error('Content is nested too deeply.');if(typeof v==='string'&&(v.length>20000||/^\s*(javascript|vbscript|data):/i.test(v)))throw Error('Unsupported content or URL.');if(v&&typeof v==='object')for(const [k,item]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsupported field.');if(k==='slug'&&(typeof item!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)))throw Error('Use lowercase letters, numbers and hyphens in slugs.');check(item,depth+1);}}
 check(d);for(const collection of [d.content.services,[...d.projects,...d.designs]]){const slugs=collection.map(x=>x.slug);if(new Set(slugs).size!==slugs.length)throw Error('Each service or project needs a unique slug.');}return d;
}
export async function hubSiteEditor(req,res,{body,send,audit}){
 const a=Buffer.from(process.env.AP_HUB_CHAT_TOKEN||''),b=Buffer.from(String(req.headers.authorization||'').replace(/^Bearer /,''));
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||a.length<32||a.length!==b.length||!crypto.timingSafeEqual(a,b)){send(res,403,{error:'Not authorized'});return;}
 try{
  if(req.method==='GET'){send(res,200,state());return;}
  if(req.method!=='POST'){send(res,405,{error:'Unsupported method'});return;}
  const p=await body(req,1000000),s=state();if(p.version!==s.version){send(res,409,{error:'Another administrator saved changes. Refresh before continuing.'});return;}
  if(p.op==='save'){validateSiteDraft(p.draft);write('draft.json',{version:s.version+1,draft:p.draft});audit('hub.site.draft.saved');}
  else if(p.op==='publish'){const old=read('request.json'),result=read('result.json');if(old&&old.id!==result?.id){send(res,409,{error:'Publication is already queued.'});return;}write('request.json',{id:crypto.randomUUID(),version:s.version,draft:s.draft,requestedAt:new Date().toISOString()});audit('hub.site.publish.queued');}
  else {send(res,400,{error:'Unsupported action'});return;}
  send(res,200,state());
 }catch(e){send(res,400,{error:/^(Keep|Content|Unsupported|Use|Each)/.test(e.message)?e.message:'Unable to save the website draft.'});}
}
