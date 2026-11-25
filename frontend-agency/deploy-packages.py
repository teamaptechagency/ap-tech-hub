"""Deploy package sections without replacing existing public page content."""
from pathlib import Path
import json,re,shutil,time
public=Path('/srv/astral/sites/aptechagency.com/public');stamp=str(int(time.time()));backup=Path('/root/aptech-before-packages-'+stamp);backup.mkdir(mode=0o700)
fragments=json.loads(Path('/tmp/package-fragments.json').read_text());catalog=json.loads(Path('/tmp/service-packages.json').read_text())
assets='<link rel="stylesheet" href="/service-packages.css?v=1">'
script='<script src="/service-packages.js?v=1" defer></script>'
paths={'index.html':fragments['home'],'services/index.html':fragments['home'],**{'services/'+slug+'/index.html':html for slug,html in fragments['details'].items()},'contact/index.html':None}
for rel,fragment in paths.items():
 p=public/rel
 if not p.exists():raise RuntimeError('Missing live page '+rel)
 dest=backup/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
 s=p.read_text()
 if fragment:
  if '<!-- service-packages:start -->' in s:s=re.sub(r'<!-- service-packages:start -->.*?<!-- service-packages:end -->',lambda _:fragment,s,flags=re.S)
  else:
   target='<section class="section process-band"' if rel=='index.html' else '<section class="section compact surface-alt connected-services"'
   if target in s:s=s.replace(target,fragment+target,1)
   else:s=s.replace('</main>',fragment+'</main>',1)
 if '/service-packages.css' not in s:s=s.replace('</head>',assets+'</head>',1)
 if '/service-packages.js' not in s:s=s.replace('</body>',script+'</body>',1)
 p.write_text(s)
for f in ['service-packages.css','service-packages.js','service-packages.json']:
 if (public/f).exists():shutil.copy2(public/f,backup/f)
 shutil.copy2('/tmp/'+f,public/f)
# Preserve owner edits; merge only the new package fields into each catalog.
keys=['packages','packageBilling','packageNote','packageDiscountPercent','currency'];lookup={s['slug']:s for s in catalog}
def merge(content):
 for service in content.get('services',[]):
  if service.get('slug') in lookup:
   for key in keys:service[key]=lookup[service['slug']][key]
for name in ['draft.json','published.json']:
 p=Path('/var/lib/aptech-agency/site-editor')/name
 if not p.exists():continue
 shutil.copy2(p,backup/name);d=json.loads(p.read_text());merge(d['draft']['content'])
 if name=='draft.json':d['version']=int(d['version'])+1
 tmp=p.with_suffix('.packages.tmp');tmp.write_text(json.dumps(d));tmp.chmod(0o600);shutil.chown(tmp,user='aptech-agency',group='aptech-agency');tmp.replace(p)
builder=Path('/opt/aptech-site-builder')
p=builder/'src/content.json';shutil.copy2(p,backup/'builder-content.json');d=json.loads(p.read_text());merge(d);p.write_text(json.dumps(d,indent=2))
p=builder/'scripts/build-site.mjs';shutil.copy2(p,backup/'build-site.mjs');s=p.read_text()
if "from './service-packages.mjs'" not in s:
 s="import {servicePackages} from './service-packages.mjs';\n"+s
 s=s.replace('${process()}<section class="section" id="about">','${servicePackages(data.services)}${process()}<section class="section" id="about">')
 s=s.replace('+reviewSection()+faq(commonFAQ.slice(0,3))+cta()', '+servicePackages(data.services)+reviewSection()+faq(commonFAQ.slice(0,3))+cta()')
 s=s.replace("${isAI?aiDelivery():''}${reviewSection()}","${isAI?aiDelivery():''}${servicePackages(data.services,s.slug)}${reviewSection()}")
 s=s.replace('<link rel="stylesheet" href="/brand-cursor.css">','<link rel="stylesheet" href="/brand-cursor.css">'+assets)
 s=s.replace('<script src="/marketing.js?v=1" defer>',script+'<script src="/marketing.js?v=1" defer>')
 s+="\nfs.writeFileSync(path.join(dist,'service-packages.json'),JSON.stringify(data.services.filter(s=>s.packages?.length===3).map(({slug,shortTitle,packages,packageBilling,packageNote,packageDiscountPercent,currency})=>({slug,shortTitle,packages,packageBilling,packageNote,packageDiscountPercent,currency})),null,2)+'\\n');\n"
 p.write_text(s)
shutil.copy2('/tmp/service-packages.mjs',builder/'scripts/service-packages.mjs')
(builder/'dist').mkdir(parents=True,exist_ok=True)
for f in ['service-packages.css','service-packages.js','service-packages.json']:shutil.copy2('/tmp/'+f,builder/'dist'/f)
publisher=builder/'publish.py';s=publisher.read_text()
if "scripts/service-packages.mjs" not in s:
 shutil.copy2(publisher,backup/'publish.py')
 needle="            shutil.copy2(BUILDER/'scripts/build-site.mjs', stage/'scripts/build-site.mjs')"
 assert needle in s
 s=s.replace(needle,needle+"\n            shutil.copy2(BUILDER/'scripts/service-packages.mjs', stage/'scripts/service-packages.mjs')\n            for asset in ['service-packages.css','service-packages.js']:\n                shutil.copy2(BUILDER/'dist'/asset,stage/'dist'/asset)")
 publisher.write_text(s)
print('Packages deployed. Rollback copies:',backup)
