"""Connect Aptee to the approved public service catalog. Run as root on the VPS.
Copy agency-service-context.mjs and updated voice/blog modules to /opt/aptech-agency first.
"""
import json, pathlib, shutil, subprocess, time
app = pathlib.Path('/opt/aptech-agency')
data = pathlib.Path('/var/lib/aptech-agency/site-editor')
backup = pathlib.Path('/root/aptech-service-context-' + str(int(time.time())))
backup.mkdir(mode=0o700)
server = app/'agency-server.mjs'
shutil.copy2(server, backup/server.name)
snapshot = data/'published.json'
if not snapshot.exists():
    job=json.loads((data/'request.json').read_text())
    result=json.loads((data/'result.json').read_text())
    assert result.get('state')=='published' and result.get('id')==job.get('id'), 'Wait for the current publication before initializing AI context.'
    snapshot.write_text(json.dumps({'version':job['version'],'draft':job['draft']}))
    shutil.chown(snapshot,user='aptech-agency',group='aptech-agency')
    snapshot.chmod(0o600)
s=server.read_text()
if "from './agency-service-context.mjs'" not in s:
    s="import {approvedServiceContext} from './agency-service-context.mjs';\n"+s
s=s.replace("publicContext:()=>agency.page('/')", 'publicContext:approvedServiceContext')
s=s.replace('WebSocket,sendCode:', 'WebSocket,publicContext:approvedServiceContext,sendCode:')
server.write_text(s)
provider=app/'agency-openai.mjs'
shutil.copy2(provider,backup/provider.name)
s=provider.read_text()
start=s.index('SERVICE CATALOG:')
end=s.index('Recommend a practical',start)
s=s[:start]+'SERVICE CATALOG: Offer only services included in the approved published service catalog below. Use its current scope and details as the source of truth instead of old conversation history or fixed service lists. If the catalog or a detail is unavailable, ask the team to confirm. Do not invent services, prices or guarantees. '+s[end:]
provider.write_text(s)
publisher=pathlib.Path('/opt/aptech-site-builder/publish.py')
shutil.copy2(publisher,backup/'publish.py')
s=publisher.read_text()
if "snapshot.replace(DATA / 'published.json')" not in s:
    needle="            atomic_result({'id':job['id'],'version':job['version'],'state':'published'"
    assert needle in s
    s=s.replace(needle,"            snapshot = DATA / 'published.json.tmp'\n            snapshot.write_text(json.dumps({'version':job['version'],'draft':job['draft']}))\n            shutil.chown(snapshot, user='aptech-agency', group='aptech-agency')\n            snapshot.chmod(0o600)\n            snapshot.replace(DATA / 'published.json')\n"+needle)
publisher.write_text(s)
for name in ['agency-server.mjs','agency-service-context.mjs','agency-voice.mjs','agency-blog-ai.mjs']:
    subprocess.run(['node','--check',str(app/name)],check=True)
print('Published service context configured. Restart aptech-agency after checks. Rollback:',backup)
