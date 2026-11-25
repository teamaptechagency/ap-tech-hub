"""Run on the authorized VPS after copying agency-leads.mjs into /opt/aptech-agency."""
from pathlib import Path
import shutil,time,subprocess
p=Path('/opt/aptech-agency/agency-server.mjs')
backup=Path('/root/agency-server.before-leads-'+str(int(time.time()))+'.mjs')
shutil.copy2(p,backup)
s=p.read_text()
if "from './agency-leads.mjs'" not in s:
    s="import {createLeadService,hubLeadRequest} from './agency-leads.mjs';\n"+s
    needle='const voice=createVoiceService('
    assert needle in s
    s=s.replace(needle,"const leadGeneration=createLeadService({directory:path.join(data,'lead-generation'),keys:()=>keySlots(),mail});\n"+needle,1)
    needle=" if(u.pathname==='/internal/hub-site-editor')"
    assert needle in s
    s=s.replace(needle," if(u.pathname==='/internal/hub-leads'){rate(req,'lead-generation',300);await hubLeadRequest(req,res,{body,send,service:leadGeneration});return;}\n"+needle,1)
p.write_text(s)
subprocess.run(['node','--check',str(p)],check=True)
subprocess.run(['node','--check','/opt/aptech-agency/agency-leads.mjs'],check=True)
print('AP Tech lead bridge configured. Rollback:',backup)
