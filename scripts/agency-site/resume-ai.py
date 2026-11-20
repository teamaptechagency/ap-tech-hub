"""Expose an authenticated, visitor-initiated return from team mode to Aptee."""
from pathlib import Path
import argparse
import re

parser = argparse.ArgumentParser()
parser.add_argument('--service', default='/opt/aptech-agency')
parser.add_argument('--assets', default='/srv/astral/sites/aptechagency.com/public/assets')
args = parser.parse_args()
base, assets = Path(args.service), Path(args.assets)
p = base / 'agency-chat.mjs'
s = p.read_text()
if "p.op==='resume-ai'" not in s:
    needle = "if(p.op==='state')return details(p.id,true);"
    assert needle in s
    s = s.replace(needle, "if(p.op==='resume-ai'){const c=conv(p.id);if(c.status!=='open')fail('Start a new conversation to use Aptee.');updateMode({id:p.id,mode:'ai',status:'open'});const last=one('SELECT id,actor FROM messages WHERE cid=? ORDER BY rowid DESC LIMIT 1',p.id);if(last?.actor==='visitor')scheduleAi(p.id,last.id);return {ok:true};}" + needle, 1)
    p.write_text(s)
p = base / 'agency-server.mjs'
s = p.read_text()
if 'start|state|send|resume-ai' not in s:
    assert 'start|state|send' in s
    p.write_text(s.replace('start|state|send', 'start|state|send|resume-ai'))
p = assets / 'support.js'
s = p.read_text()
if 'ap-chat-resume' not in s:
    s = s.replace('<button class="ap-chat-new">', '<button class="ap-chat-resume" type="button" hidden>Talk to Aptee</button><button class="ap-chat-new">', 1)
    needle = "if(r.conversation.status==='closed')status.textContent="
    assert needle in s
    mode = "const resume=$('.ap-chat-resume');resume.hidden=r.conversation.mode!=='human'||r.conversation.status==='closed';if(r.conversation.status==='open')status.textContent=r.conversation.mode==='human'?'Team mode. Aptee is paused. Choose Talk to Aptee for an automatic reply.':'Aptee is active. Your messages receive AI replies.';"
    s = s.replace(needle, mode + needle, 1)
    end = s.rfind('})();')
    assert end >= 0
    handler = "\n$('.ap-chat-resume').onclick=async()=>{if(!session)return;const button=$('.ap-chat-resume');button.disabled=true;try{await post('resume-ai',{id:session.id});await sync();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};\n"
    s = s[:end] + handler + s[end:]
s = s.replace("status.textContent='Live updates connected. Aptee or our team will reply here.';", '')
p.write_text(s)
p = assets / 'support.css'
if '.ap-chat-resume{' not in p.read_text():
    p.write_text(p.read_text() + '\n.ap-chat-resume{margin:8px 16px;padding:10px 14px;border:1px solid #edbb77;border-radius:7px;background:#edbb77;color:#15202c;font-weight:600;cursor:pointer}.ap-chat-resume[hidden]{display:none}\n')
p = base / 'agency-render.cjs'
s = re.sub(r'support\.js\?v=[^"\s]+', 'support.js?v=aptee-resume-1', p.read_text())
s = s.replace('/assets/support.css"', '/assets/support.css?v=aptee-resume-1"')
p.write_text(s)
print('Visitor AI resume and visible conversation mode installed.')
