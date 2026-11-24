// Runs inside the existing agency service. No credentials are embedded in assets.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const prefix='/api/agency-workspace';
const assets={workspace:'agency-admin.html','agency-admin.js':'agency-admin.js','agency-admin.css':'agency-admin.css','agency-ui.js':'workstation-agency.js','agency-ui.css':'workstation-agency.css','webmail.js':'workstation-webmail.js','chat-admin.js':'agency-chat-admin.js','barta-contract.txt':'barta-contract.txt'};
export async function hubWorkspace(req,res,{base,body,send,agency,mail,chat,sms,audit}) {
  const expected=Buffer.from(process.env.AP_HUB_CHAT_TOKEN||'');
  const received=Buffer.from(String(req.headers.authorization||'').replace(/^Bearer /,''));
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||expected.length<32||expected.length!==received.length||!crypto.timingSafeEqual(expected,received)) {send(res,403,{error:'Not authorized'});return;}
  const u=new URL(req.url,'http://localhost'),asset=u.searchParams.get('asset'),route=u.searchParams.get('route');
  if(req.method==='GET'&&asset==='hub.css'){
    res.writeHead(200,{'content-type':'text/css; charset=utf-8','cache-control':'no-store'});
    res.end('.ap-sidebar{position:static!important;width:auto!important;height:auto!important;transform:none!important;padding:8px!important}.ap-sidebar>.ap-brand,.ap-sidebar-foot,.ap-bottom-nav,.ap-topbar-tools{display:none!important}.ap-sidebar nav{display:flex!important;flex-wrap:wrap;gap:6px}.ap-sidebar nav button{width:auto!important;padding:10px 12px!important;margin:0!important}#ap-dashboard,.ap-shell{display:block!important} .ap-sidebar{min-height:0!important;max-height:none!important} .ap-sidebar nav button{height:auto!important;min-height:0!important;flex:0 0 auto!important}.ap-main{margin:0!important;padding:16px!important;width:100%!important}.ap-topbar{padding:12px 0!important}.ap-ambient{display:none}body{min-height:0!important}.agency-card{max-width:100%}');return;
  }
  if(req.method==='GET'&&asset) {
    if(!assets[asset]){send(res,404,{error:'Asset not found'});return;}
    let text=fs.readFileSync(path.join(base,'public',assets[asset]),'utf8');
    if(asset==='workspace') {
      text=text.replace(/\/agency-admin-assets\/([a-z-]+\.(?:css|js|txt))(?:\?[^"']*)?/g,(_,name)=>prefix+'?asset='+name)
        .replaceAll('/assets/ap-mark.png','https://aptechagency.com/assets/ap-mark.png')
        .replace('<div id="genericContent">','<p class="agency-card">This editor retains previous website content and revisions. Publish updates the legacy CMS; redesigned public pages are deployed separately.</p><div id="genericContent">')
        .replace('</head>',`<link rel="stylesheet" href="${prefix}?asset=hub.css"></head>`);
    }
    if(asset==='agency-admin.js') {
      const start=text.indexOf('async function raw('),end=text.indexOf('async function api(',start);
      if(start<0||end<0)throw Error('Unsupported workspace script');
      text=text.slice(0,start)+`async function raw(route,payload){if(route==='session')return {account:'Hub administrator'};if(route==='logout'){window.top.location.href='/dashboard';return {};}const response=await fetch('${prefix}?route='+encodeURIComponent(route),{method:payload?'POST':'GET',headers:{'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});const data=await response.json();if(!response.ok)throw Error(data.error||'Website request failed');return data;}\n`+text.slice(end);
      text=text.replace('window.AstralAgency.navigate(button.dataset.apTab);',"if(button.dataset.apTab==='chat'){window.top.location.href='/messages?tab=website';return;}window.AstralAgency.navigate(button.dataset.apTab);");
      const smsStart=text.indexOf('async function smsScreen()'),smsEnd=text.indexOf("addEventListener('DOMContentLoaded'",smsStart);
      if(smsStart<0||smsEnd<0)throw Error('Unsupported security screen');
      text=text.slice(0,smsStart)+`async function smsScreen(){const info=await raw('sms',{op:'status'});byId('genericContent').innerHTML='<form id="hub-sms-form" class="agency-card"><h2>SMS connection</h2><p>Account and sign-in security are managed by your Hub profile.</p><p>SMS provider: '+safe(info.ready?'Configured':'Not configured')+'</p><label>OneCodeSoft API URL<input type="url" name="baseUrl" value="'+safe(info.baseUrl||'https://sms.ocs-api.top/api/')+'" required></label><label>New API key · leave blank to retain<input type="password" name="apiKey" autocomplete="off"></label><label>Sender ID<input name="senderId" maxlength="100" value="'+safe(info.senderId||'')+'"></label><button class="btn primary">Check sandbox & save</button><p id="hub-sms-result" role="status"></p></form>';byId('hub-sms-form').onsubmit=async event=>{event.preventDefault();const f=event.target,b=event.submitter;b.disabled=true;try{await raw('sms',{op:'save',...Object.fromEntries(new FormData(f))});f.elements.apiKey.value='';byId('hub-sms-result').textContent='Settings saved. No SMS was sent.';}catch(error){byId('hub-sms-result').textContent=error.message;}finally{b.disabled=false;}};}\n`+text.slice(smsEnd);
    }
    // Private preview/media URLs must also pass through Hub authorization.
    if(asset.endsWith('.js'))text=text.replaceAll('/agency-api/admin/media?',prefix+'?route=media&').replaceAll('/agency-api/admin/preview?',prefix+'?route=preview&').replaceAll('/agency-admin-assets/barta-contract.txt',prefix+'?asset=barta-contract.txt');
    res.writeHead(200,{'content-type':asset==='workspace'?'text/html; charset=utf-8':asset.endsWith('.js')?'text/javascript; charset=utf-8':asset.endsWith('.txt')?'text/plain; charset=utf-8':'text/css; charset=utf-8','cache-control':'no-store'});res.end(text);return;
  }
  if(req.method==='GET'&&route==='media'){const f=agency.asset(u.searchParams.get('id'),true);res.writeHead(200,{'content-type':f.mime,'cache-control':'no-store'});fs.createReadStream(f.path).pipe(res);return;}
  if(req.method==='GET'&&route==='preview'){const html=agency.page(u.searchParams.get('page')||'/',true).replace(/<script[\s\S]*?<\/script>/g,'');res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);return;}
  if(req.method!=='POST'||!['cms','mail','chat','integration','sms'].includes(route)){send(res,400,{error:'Unsupported website action'});return;}
  const p=await body(req,6*1048576);let result;
  if(route==='cms')result=agency.operation(p);
  else if(route==='mail'){p.domain='aptechagency.com';result=await mail.operation(p);}
  else if(route==='chat')result=chat.admin(p);
  else if(route==='integration')result=chat.integration(p);
  else if(p.op==='status')result={...sms.status(),account:'Hub administrator'};
  else if(p.op==='save')result=await sms.save(p);
  else {send(res,400,{error:'Unsupported SMS action'});return;}
  if(!['state','read','status','settings','list','folders'].includes(p.op))audit('hub.workspace.'+route+'.'+String(p.op||'change'));
  send(res,200,result);
}
