"""Install the public Aptee voice transport, preserving current content and secrets.
Run as root after extracting the reviewed files into /tmp/aptech-voice-release.
"""
from pathlib import Path
import base64,hashlib,io,json,shutil,subprocess,tarfile,time,urllib.request
SRC=Path('/tmp/aptech-voice-release')
APP=Path('/opt/aptech-agency')
PUBLIC=Path('/srv/astral/sites/aptechagency.com/public')
BUILDER=Path('/opt/aptech-site-builder')
BACKUP=Path('/root/aptech-voice-rollback-'+str(int(time.time())))
BACKUP.mkdir(mode=0o700)
for name in ['agency-server.mjs','agency-chat.mjs']:
    shutil.copy2(APP/name,BACKUP/name)
for name in ['livechat-voice.js','livechat-adapter.css']:
    shutil.copy2(PUBLIC/name,BACKUP/name)

# Pinned dependency, verified against the reviewed npm integrity before extraction.
url='https://registry.npmjs.org/ws/-/ws-8.23.0.tgz'
payload=urllib.request.urlopen(url,timeout=30).read()
expected='wCkmX8QMOrKjgO8HW2WyDbTSGeqkocxgDzS9iR79rEAexty6/2qzilx3Ag8Tqf9ykop3irLKle0MtVn5qjVnoQ=='
assert base64.b64encode(hashlib.sha512(payload).digest()).decode()==expected
dest=APP/'node_modules/ws'
dest.mkdir(parents=True,exist_ok=True)
with tarfile.open(fileobj=io.BytesIO(payload),mode='r:gz') as archive:
    for member in archive.getmembers():
        parts=Path(member.name).parts
        assert parts[0]=='package' and '..' not in parts and not member.issym() and not member.islnk()
        if not member.isfile(): continue
        target=dest.joinpath(*parts[1:]);target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(archive.extractfile(member).read())

shutil.copy2(SRC/'integrations/agency-voice.mjs',APP/'agency-voice.mjs')
server=(APP/'agency-server.mjs').read_text()
if "from './agency-voice.mjs'" not in server:
    server="import {createVoiceService} from './agency-voice.mjs';\nimport {keySlots} from './agency-openai-keys.mjs';\nimport WebSocket from 'ws';\n"+server
    needle="function rate(req,key,limit=120)"
    assert needle in server
    server=server.replace(needle,"const voice=createVoiceService({chat,keys:()=>keySlots(),WebSocket});\n"+needle,1)
    needle=" if(req.method==='POST'&&/^chat\\/(start|state|send|resume-ai)$/.test(route))"
    assert needle in server
    server=server.replace(needle," if(req.method==='POST'&&route==='chat/voice'){rate(req,'voice',30);await voice(req,res,{body,send});return;}\n"+needle,1)
# Voice verification uses only the selected website mailbox, never another site's sender.
server=server.replace("const voice=createVoiceService({chat,keys:()=>keySlots(),WebSocket});", "const voice=createVoiceService({chat,keys:()=>keySlots(),WebSocket,sendCode:async(to,code)=>{const account=mail.status('aptechagency.com');if(!account.configured)throw Object.assign(Error('Configure AP Tech email in Integration & Config before voice verification can send codes.'),{status:503});await mail.operation({op:'send',domain:'aptechagency.com',revision:account.revision,confirmSend:true,requestKey:crypto.randomUUID(),to,subject:'Your Aptee voice verification code',text:'Your AP Tech Agency voice verification code is '+code+'. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.'});}});")
(APP/'agency-server.mjs').write_text(server)
chat=(APP/'agency-chat.mjs').read_text()
if 'voiceTranscript:' not in chat:
    assert 'function message(cid,p,actor)' in chat and "if(actor==='visitor')scheduleAi(cid,id)" in chat
    chat=chat.replace('function message(cid,p,actor)','function message(cid,p,actor,voice=false)',1)
    chat=chat.replace("if(actor==='visitor')scheduleAi(cid,id)","if(actor==='visitor'&&!voice)scheduleAi(cid,id)",1)
    chat=chat.replace('return {publicOperation,visitor,details,stream,admin,',"return {voiceTranscript:(cid,p,actor)=>{if(!['visitor','ai'].includes(actor))throw Error('Invalid voice actor');return message(cid,p,actor,true);},publicOperation,visitor,details,stream,admin,",1)
(APP/'agency-chat.mjs').write_text(chat)
for name in ['agency-server.mjs','agency-chat.mjs','agency-voice.mjs']:
    subprocess.run(['node','--check',str(APP/name)],check=True)

for name in ['livechat-voice.js','livechat-adapter.css']:
    shutil.copy2(SRC/'frontend-agency/dist'/name,PUBLIC/name)
    shutil.copy2(SRC/'frontend-agency/dist'/name,BUILDER/name)
# Keep publication rebuilds on this release too. No content is rebuilt here.
for path in list(PUBLIC.rglob('*.html'))+[BUILDER/'scripts/build-site.mjs']:
    old=path.read_text()
    updated=old.replace('voice-visual-2','realtime-voice-1')
    if old!=updated:path.write_text(updated)
subprocess.run(['systemctl','restart','aptech-agency'],check=True)
print('Aptee Realtime transport and public UI installed. Rollback:',BACKUP)
