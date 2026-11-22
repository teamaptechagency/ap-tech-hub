"""Keep the retired portal redirect in the controller's source of truth."""
from pathlib import Path
import json, shutil, time, sys, types, importlib

backup=Path('/root/aptech-persistent-redirect-'+str(int(time.time())))
backup.mkdir(mode=0o700)
source=Path('/opt/astral-panel/deploy/lifecycle.py')
inventory=Path('/var/lib/astral-agent/inventory.json')
for p in [source,inventory]:shutil.copy2(p,backup/p.name)
s=source.read_text()
marker='        target=a.domain(site[\'redirect_domain\'])\n'
addition='''        # Retired Hub web portal: keep only existing authenticated agent APIs.
        if site['domain']=='portal.aptechagency.com' and target=='manage.aptechagency.com':
            out+='location ~ ^/api/(device-agent|device-attendance|workstation|workstation-chat|workstation-support|business-office|blog-image)$ { proxy_pass http://127.0.0.1:3311; proxy_http_version 1.1; proxy_set_header Host manage.aptechagency.com; proxy_set_header X-Forwarded-Proto https; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_read_timeout 300s; }\\n'
'''
if '# Retired Hub web portal:' not in s:
    if marker not in s:raise RuntimeError('Controller redirect insertion changed')
    source.write_text(s.replace(marker,marker+addition,1))
compile(source.read_text(),str(source),'exec')
items=json.loads(inventory.read_text())
site=next(x for x in items if x.get('kind')=='site' and x.get('domain')=='portal.aptechagency.com')
site['redirect_domain']='manage.aptechagency.com'
tmp=inventory.with_suffix('.hub.tmp');tmp.write_text(json.dumps(items));tmp.chmod(inventory.stat().st_mode & 0o777);tmp.replace(inventory)
sys.path.insert(0,'/opt/astral-panel/deploy')
agent=importlib.import_module('agent')
conf=Path('/etc/nginx/sites-enabled/astral-portal.aptechagency.com').resolve()
shutil.copy2(conf,backup/conf.name)
conf.write_text(agent.nginx_config(types.SimpleNamespace(**vars(agent)),site))
print('Persistent redirect prepared. Validate Nginx before reload. Backup:',backup)
