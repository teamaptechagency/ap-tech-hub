"""Read-only route and integration smoke checks; no email or record mutations."""
from pathlib import Path
import concurrent.futures,json,re,urllib.request,urllib.error,urllib.parse
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
def check(url,headers=None):
    try:
        response=urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url,headers=headers or {}),timeout=20)
    except urllib.error.HTTPError as error:response=error
    except Exception:return {'url':url,'status':0,'error':'Connection failed'}
    return {'url':url,'status':response.code,'location':response.headers.get('Location','')}
root=Path.cwd();paths=set()
for file in (root/'components/layout').glob('*sidebar.tsx'):
    paths.update(x for x in re.findall(r'href:\s*["\']([^"\']+)',file.read_text()) if x.startswith('/'))
routes=list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(lambda p:check('https://manage.aptechagency.com'+p),sorted(paths)))
env=dict(line.split('=',1) for line in Path('/etc/aptech-hub/common.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
headers={'Accept':'application/json','Authorization':'Bearer '+env['WPN_HUB_TOKEN'].strip('"'),'X-AP-Tech-Hub':'1'}
wp_paths=['/api/v1/admin/session','/api/v1/admin/client-projects','/api/v1/admin/clients','/api/v1/admin/leads','/api/admin/hub-inbox','/api/v1/admin/public-chat','/api/v1/admin/personal-assistant','/api/v1/admin/integrations','/api/v1/admin/ai-settings','/api/admin/dashboard','/api/admin/profile']
wp=[check('http://127.0.0.1:18027'+p,headers) for p in wp_paths]
public=[]
for base in ['https://aptechagency.com','https://wpnazmul.com']:
    html=urllib.request.urlopen(base+'/',timeout=20).read().decode()
    links={'/'}|{urllib.parse.urlsplit(p).path for p in re.findall(r'href=["\'](/[^"\']*)',html) if not p.startswith('//') and not re.search(r'\.(png|jpg|svg|ico|css|js|pdf|zip|exe)$',urllib.parse.urlsplit(p).path) and not p.startswith(('/api/','/_next/'))}
    public.extend(check(base+p) for p in sorted(links))
result={'protected_routes':routes,'wp_backend_reads':wp,'public_pages':public}
Path('/tmp/aptech-screen-check.json').write_text(json.dumps(result,indent=2))
print('Protected menu routes:',len(routes),'expected login redirects:',sum(r['status'] in [302,303,307,308] and '/login' in r.get('location','') for r in routes))
print('WP backend reads:',len(wp),'successful:',sum(r['status']==200 for r in wp))
print('Public linked pages:',len(public),'successful:',sum(r['status']==200 for r in public))
for group,rows in result.items():
    for row in rows:
        good=(row['status'] in [302,303,307,308] and '/login' in row.get('location','')) if group=='protected_routes' else row['status']==200
        if not good:print('REVIEW',group,json.dumps(row))
print('Detailed read-only results saved privately on server.')

