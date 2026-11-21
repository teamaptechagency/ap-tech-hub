from pathlib import Path
p=Path('/opt/aptech-agency/agency-server.mjs')
s=p.read_text()
marker=" if(u.pathname==='/health')"
bridge=""" if(u.pathname==='/internal/hub-mail'){
 const expected=process.env.AP_HUB_CHAT_TOKEN||'',received=String(req.headers.authorization||'').replace(/^Bearer /,'');
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||expected.length<32||received.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(received),Buffer.from(expected))||req.method!=='POST'){send(res,403,{error:'Not authorized'});return;}
 const p=await body(req,150000);if(!['settings','settings.save','test','folders','list','read','send'].includes(p.op)){send(res,400,{error:'Unsupported mailbox action'});return;}
 p.domain='aptechagency.com';rate(req,'hub-mail',p.op==='send'?20:600);const result=await mail.operation(p);if(['send','settings.save'].includes(p.op))audit('hub.mail.'+p.op);send(res,200,result);return;
 }
"""
if "u.pathname==='/internal/hub-mail'" not in s:
    if marker not in s: raise RuntimeError('Server insertion point missing')
    p.write_text(s.replace(marker,bridge+marker,1))
