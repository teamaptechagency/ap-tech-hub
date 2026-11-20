"""Apply the public-site AI adapter without embedding credentials in source."""
from pathlib import Path
import argparse
import shutil
import time

parser = argparse.ArgumentParser()
parser.add_argument('--service', default='/opt/aptech-agency')
parser.add_argument('--assets', default='/srv/astral/sites/aptechagency.com/public/assets')
parser.add_argument('--logo', required=True)
args = parser.parse_args()
base, assets = Path(args.service), Path(args.assets)
backup = base / ('backup-ai-logo-' + str(int(time.time())))
backup.mkdir(mode=0o700)
for name in ['agency-chat.mjs', 'agency-server.mjs', 'agency-render.cjs']:
    shutil.copy2(base / name, backup / name)
for name in ['support.js', 'site.css']:
    shutil.copy2(assets / name, backup / name)
shutil.copyfile(Path(__file__).with_name('agency-openai.mjs'), base / 'agency-openai.mjs')
(base / 'agency-openai.mjs').chmod(0o644)
shutil.copyfile(args.logo, assets / 'ap-mark-hub-v2.png')
(assets / 'ap-mark-hub-v2.png').chmod(0o644)

p = base / 'agency-chat.mjs'
s = p.read_text()
if "from './agency-openai.mjs'" not in s:
    s = "import {openaiReply,openaiReady} from './agency-openai.mjs';\n" + s
    s = s.replace("requestAi=bartaReply})", "requestAi=bartaReply,publicContext=()=>''})")
    s = s.replace('function configuration(){', 'function storedConfiguration(){', 1)
    s = s.replace(' const storeConfig=', " function configuration(){const c=storedConfiguration();return openaiReady()?{...c,provider:'openai',nativeEnabled:true,nativeKey:process.env.OPENAI_API_KEY,nativeVersion:'openai-env-v1',dailyLimit:Math.min(100,Number(process.env.AP_AI_DAILY_LIMIT)||100)}:c;}\n const storeConfig=", 1)
    s = s.replace('return !!(c.nativeEnabled&&validBartaKey(c.nativeKey));', "return c.provider==='openai'?openaiReady():!!(c.nativeEnabled&&validBartaKey(c.nativeKey));")
    s = s.replace('await requestAi({apiKey:cfg.nativeKey,...payload})', "await (cfg.provider==='openai'?openaiReply:requestAi)({apiKey:cfg.nativeKey,...payload,context:publicContext()})")
    s = s.replace('nativeConfigured:validBartaKey(c.nativeKey)', "nativeConfigured:nativeReady(c),provider:c.provider||'barta'")
    s = s.replace('nativeEndpoint:"https://bartabm.io/api/website-chat/message"', "nativeEndpoint:c.provider==='openai'?'https://api.openai.com/v1/responses':'https://bartabm.io/api/website-chat/message'")
    s = s.replace('Barta reply unavailable. Check credentials, balance and instructions.', 'AI reply unavailable. Check provider credentials and billing.')
if 'const lastText=' not in s:
    s = s.replace('function scheduleAi(cid,id){const c=configuration();', "function scheduleAi(cid,id){const lastText=one('SELECT text FROM messages WHERE id=?',id)?.text||'';if(conv(cid)?.mode==='ai'&&/\\b(human|real person|talk to (?:a )?person|speak to (?:a )?person)\\b|মানুষ|কর্মীর সাথে|টিমের সাথে/i.test(lastText)){message(cid,{text:'I have passed this conversation to the AP Tech team. A team member can reply here.',requestKey:random()},'ai');updateMode({id:cid,mode:'human',status:'open'});return;}const c=configuration();")
p.write_text(s)
p = base / 'agency-server.mjs'
p.write_text(p.read_text().replace('chat=createAgencyChat({directory:data})', "chat=createAgencyChat({directory:data,publicContext:()=>agency.page('/')})"))
p = base / 'agency-render.cjs'
s = p.read_text().replace('/assets/ap-mark-official.png', '/assets/ap-mark-hub-v2.png')
s = s.replace('/assets/site.css"', '/assets/site.css?v=logo-ai-1"').replace('/assets/support.js"', '/assets/support.js?v=logo-ai-1"')
p.write_text(s)
p = assets / 'site.css'
if '.wordmark img{width:62px' not in p.read_text():
    p.write_text(p.read_text() + '\n.wordmark img{width:62px;height:42px;object-fit:contain;flex-shrink:0}.site-footer .wordmark img{width:56px;height:38px}\n')
p = assets / 'support.js'
s = p.read_text().replace("?'Barta AI':", "?'Aptee':").replace("AP Tech AI", "Aptee").replace('may be handled through Barta when enabled.', 'may be answered by Aptee using OpenAI. Ask for a person at any time.').replace('Message the AP Tech team', 'AI project help or the AP Tech team').replace('Our team will reply here.', 'Aptee or our team will reply here.')
p.write_text(s)
print('Public site adapter applied. Credentials remain in the private service environment.')
