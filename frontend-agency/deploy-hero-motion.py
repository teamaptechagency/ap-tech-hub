from pathlib import Path
import shutil,time,re
root=Path('/srv/astral/sites/aptechagency.com/public');backup=Path('/root/aptech-before-hero-motion-'+str(int(time.time())));backup.mkdir(mode=0o700)
for name,marker in [('site.css','/* Hero workflow motion'),('site.js','// Automatic hero demonstration')]:
 p=root/name;shutil.copy2(p,backup/name);source=Path('/tmp/hero-'+name).read_text();addition=source[source.index(marker):];old=p.read_text();old=old.split(marker)[0];p.write_text(old.rstrip()+'\n\n'+addition)
for p in root.rglob('*.html'):
 s=p.read_text();updated=re.sub(r'(/site\.(?:css|js))(?:\?[^"\s>]*)?',r'\1?v=hero-motion-1',s)
 if updated!=s:
  q=backup/'html'/p.relative_to(root);q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);p.write_text(updated)
p=Path('/opt/aptech-site-builder/scripts/build-site.mjs');s=p.read_text();p.write_text(re.sub(r'(/site\.(?:css|js))(?:\?[^"\s>]*)?',r'\1?v=hero-motion-1',s))
print('Hero motion deployed with rollback copy')
