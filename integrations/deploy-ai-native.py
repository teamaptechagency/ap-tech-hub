"""Install the unified native editor and daily blog worker after candidate validation."""
from pathlib import Path
import json, os, secrets, shutil, subprocess, time

ROOT=Path('/srv/astral/sites/manage.aptechagency.com/releases/aptech-hub-native-complete')
assert (ROOT/'.next/BUILD_ID').is_file()
STAMP=str(int(time.time()))
def write(path,text,mode=0o644):
    p=Path(path);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text);p.chmod(mode)
def service_env(service):
    pid=subprocess.check_output(['systemctl','show',service,'-p','MainPID','--value'],text=True).strip()
    return dict(item.split('=',1) for item in Path('/proc/'+pid+'/environ').read_text().split('\0') if '=' in item)

env=service_env('aptech-manage')
agency_env=service_env('aptech-agency')
assert agency_env.get('AP_DATA','/var/lib/aptech-agency')=='/var/lib/aptech-agency'
BUILDER=Path('/opt/aptech-site-builder')
for name in ['src','scripts']:
    shutil.copytree(ROOT/'frontend-agency'/name,BUILDER/name,dirs_exist_ok=True)
shutil.copy2(ROOT/'integrations/agency-site-editor.mjs','/opt/aptech-agency/agency-site-editor.mjs')
shutil.copy2(ROOT/'integrations/agency-blog-ai.mjs','/opt/aptech-agency/agency-blog-ai.mjs')
shutil.copy2(ROOT/'integrations/publish-agency-site.py','/opt/aptech-site-builder/publish.py')
p=Path('/opt/aptech-agency/agency-server.mjs');shutil.copy2(p,'/root/agency-before-native-'+STAMP+'.mjs');s=p.read_text()
if "from './agency-blog-ai.mjs'" not in s:
    s="import { hubBlogGenerate, publicBlogImage } from './agency-blog-ai.mjs';\n"+s
    needle=" if(u.pathname==='/internal/hub-workspace')"
    assert needle in s
    s=s.replace(needle," if(u.pathname==='/internal/hub-blog-generate'){rate(req,'hub-blog-generate',20);await hubBlogGenerate(req,res,{body,send});return;}\n if(u.pathname.startsWith('/api/agency/public/blog-ai/')){publicBlogImage(req,res,send);return;}\n"+needle,1)
if "from './agency-site-editor.mjs'" not in s:
    s="import { hubSiteEditor } from './agency-site-editor.mjs';\n"+s
    needle=" if(u.pathname==='/internal/hub-workspace')"
    assert needle in s
    s=s.replace(needle," if(u.pathname==='/internal/hub-site-editor'){rate(req,'hub-site-editor',3000);await hubSiteEditor(req,res,{body,send,audit});return;}\n"+needle,1)
p.write_text(s)
subprocess.run(['node','--check',str(p)],check=True)
subprocess.run(['systemctl','restart','aptech-agency'],check=True)

write('/etc/systemd/system/aptech-site-publish.service','[Unit]\nDescription=Publish approved AP Tech website content\n[Service]\nType=oneshot\nExecStart=/usr/bin/python3 /opt/aptech-site-builder/publish.py\nTimeoutStartSec=150\n')
write('/etc/systemd/system/aptech-site-publish.timer','[Unit]\nDescription=Check AP Tech website publication queue\n[Timer]\nOnCalendar=*-*-* *:*:00\nAccuracySec=5\nPersistent=true\n[Install]\nWantedBy=timers.target\n')

secret_file=Path('/etc/aptech-hub/blog-auto.env')
if not secret_file.exists():write(secret_file,'BLOG_AUTOMATION_SECRET='+secrets.token_hex(32)+'\n',0o600)
write('/etc/systemd/system/aptech-manage.service.d/98-blog-auto.conf','[Service]\nEnvironmentFile=/etc/aptech-hub/blog-auto.env\n')
write('/opt/aptech-site-builder/blog-auto.py', '''import os, urllib.request, json
req=urllib.request.Request('http://127.0.0.1:3311/api/cron/blog-auto',data=b'{}',headers={'Host':'manage.aptechagency.com','Authorization':'Bearer '+os.environ['BLOG_AUTOMATION_SECRET'],'Content-Type':'application/json'})
with urllib.request.urlopen(req,timeout=280) as r: print(json.dumps(json.load(r)))
''')
write('/etc/systemd/system/aptech-blog-auto.service','[Unit]\nDescription=Run AP Tech daily AI blog schedule\nAfter=aptech-manage.service\n[Service]\nType=oneshot\nUser=as_79e797e0573d4692\nEnvironmentFile=/etc/aptech-hub/blog-auto.env\nExecStart=/usr/bin/python3 /opt/aptech-site-builder/blog-auto.py\nTimeoutStartSec=300\n')
write('/etc/systemd/system/aptech-blog-auto.timer','[Unit]\nDescription=Check AP Tech AI blog schedule\n[Timer]\nOnCalendar=*-*-* *:*:00\nAccuracySec=10\nPersistent=true\n[Install]\nWantedBy=timers.target\n')

# The user requested automatic publishing. Start with one English post daily at 09:00 Dhaka.
# Existing owner configuration is preserved on every redeployment.
config={'enabled':True,'time':'09:00','instructions':'Write a useful, original English article for business owners about website development, UI/UX, web apps or mobile apps. Give practical examples. Avoid invented facts, statistics, client stories and promises. Vary the topic each day.','thumbnailTheme':'Premium editorial illustration. Deep navy, forest green and soft lime accents. Clean composition, generous space, no text, no logos, no watermarks.'}
js="const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); (async()=>{await p.setting.upsert({where:{key:'blog.automation.aptech.v1'},create:{key:'blog.automation.aptech.v1',value:process.env.INITIAL_BLOG_CONFIG},update:{}});await p.$disconnect();})().catch(()=>process.exit(1));"
subprocess.run(['runuser','-u','as_79e797e0573d4692','--','node','-e',js],cwd=ROOT,env={**env,'INITIAL_BLOG_CONFIG':json.dumps(config)},check=True)

dropin=Path('/etc/systemd/system/aptech-manage.service.d/99-openai-keys.conf');shutil.copy2(dropin,'/root/manage-before-ai-native-'+STAMP+'.conf')
dropin.write_text('\n'.join('WorkingDirectory='+str(ROOT) if line.startswith('WorkingDirectory=') else line for line in dropin.read_text().splitlines())+'\n')
for name in ['/opt/astral-panel/deploy/lifecycle.py','/etc/nginx/sites-available/astral-aptechagency.com']:
    p=Path(name);s=p.read_text();shutil.copy2(p,'/root/'+p.name+'-before-ai-native-'+STAMP)
    s=s.replace('https://manage.aptechagency.com/website-management','https://manage.aptechagency.com/site-content')
    if 'location = /blog {' not in s:
        proxy='proxy_pass http://127.0.0.1:3311; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https;'
        routes='location = /blog { '+proxy+' }\nlocation ^~ /blog/ { '+proxy+' }\nlocation ^~ /_next/ { '+proxy+' }\n'
        s=s.replace('location = /admin {',routes+'location = /admin {',1)
    if name.endswith('.py'):compile(s,name,'exec')
    p.write_text(s)
public=Path('/srv/astral/sites/aptechagency.com/public')
for p in public.rglob('*.html'):
    old=p.read_text();updated=old.replace('href="/insights/"','href="/blog"').replace('>Insights</a>','>Blog</a>')
    if old!=updated:p.write_text(updated)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','restart','aptech-manage'],check=True)
subprocess.run(['nginx','-t'],check=True)
subprocess.run(['systemctl','reload','nginx'],check=True)
subprocess.run(['systemctl','restart','astral-agent'],check=True)
subprocess.run(['systemctl','enable','--now','aptech-site-publish.timer','aptech-blog-auto.timer'],check=True)
print('Native two-site admin and AI schedule installed; rollback stamp:',STAMP)
