"""Route public pages to the supplied frontend; retain all existing API/admin handlers."""
from pathlib import Path
import re,shutil,time,subprocess,json
root=Path('/srv/astral/sites/aptechagency.com/releases/design-20261124/dist')
assert (root/'index.html').exists() and (root/'assets/support.js').exists()
# The panel regenerates Nginx. Persist the frontend preference in its inventory.
controller=Path('/opt/astral-panel/deploy/lifecycle.py')
source=controller.read_text()
old="        for slug in ('home','about','services','reviews','contact','privacy','portfolio'):"
if old in source:
 shutil.copy2(controller,'/root/lifecycle-before-frontend-'+str(int(time.time()))+'.py')
 controller.write_text(source.replace(old,"        for slug in (() if pathlib.Path('/srv/astral/sites/aptechagency.com/public/.frontend-static').is_file() else ('home','about','services','reviews','contact','privacy','portfolio')):"))
inventory=Path('/var/lib/astral-agent/inventory.json')
sites=json.loads(inventory.read_text())
shutil.copy2(inventory,'/root/inventory-before-frontend-'+str(int(time.time()))+'.json')
next(site for site in sites if site.get('domain')=='aptechagency.com')['agency_static_frontend']=True
inventory.write_text(json.dumps(sites,indent=2))
public=Path('/srv/astral/sites/aptechagency.com/public')
shutil.make_archive('/root/aptech-public-before-design-'+str(int(time.time())),'gztar',public)
shutil.copytree(root,public,dirs_exist_ok=True)
(public/'.frontend-static').write_text('Supplied frontend design 2026-11-24\n')
subprocess.run(['systemctl','restart','astral-agent'],check=True)
p=Path('/etc/nginx/sites-available/astral-aptechagency.com');s=p.read_text()
backup='/root/aptech-nginx-before-frontend-'+str(int(time.time()))+'.conf'
shutil.copy2(p,backup)
s='\n'.join(line for line in s.splitlines() if not ('location = ' in line and '8788/api/agency/public/page/' in line))+'\n'
p.write_text(s)
result=subprocess.run(['nginx','-t'],capture_output=True,text=True)
if result.returncode:
 shutil.copy2(backup,p)
 raise RuntimeError('Nginx validation failed; previous configuration restored')
subprocess.run(['systemctl','reload','nginx'],check=True)
print('New public frontend active. Backend/API configuration retained. Rollback:',backup)
