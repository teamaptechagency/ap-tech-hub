"""Prepare only the Work React page from current public content."""
from pathlib import Path
import json,re,subprocess,sys,tempfile
root=Path(sys.argv[1]);app=Path(sys.argv[2]);source=Path(sys.argv[3]);out=app/'work';out.mkdir(parents=True,exist_ok=True)
html=(root/'work/index.html').read_text()
projects=re.findall(r'<a\b[^>]*class="work-card[^\"]*"[^>]*href="([^\"]+)"',html)
if not projects:
 projects=re.findall(r'<a\b[^>]*href="([^\"]+)"[^>]*class="work-card',html)
assert projects and len(projects)==len(set(projects)), 'Project identifiers missing or duplicated'
content=json.loads((source/'content.json').read_text());reviews=json.loads((source/'reviews.json').read_text())
summary={'projects':projects,'services':[x['slug'] for x in content['services']],'reviews':[x['id'] for x in reviews['reviews']]}
(out/'work-summary.json').write_text(json.dumps(summary,indent=2))
assert '<h1>Different projects. The same care.</h1>' in html
html=html.replace('<section class="page-hero">','<section class="page-hero work-page-hero">',1).replace('<h1>Different projects. The same care.</h1>','<h1>Different projects.<span class="work-care">The same care.</span></h1>',1)
html=re.sub(r'(<section class="page-hero work-page-hero">[\s\S]*?<p class="lead">[\s\S]*?</p>)',r'\1<div data-work-statistics></div>',html,count=1)
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'index.html';p.write_text(html)
 subprocess.run([sys.executable,str(app.parent/'scripts/import-homepage.py'),str(p),str(out),'../interactions'],check=True)
p=out/'page.jsx';jsx=p.read_text();jsx="import './work-hero.css';\nimport WorkStatistics from '../../components/work-statistics';\n"+jsx
jsx,n=re.subn(r'<div data-work-statistics=""></div>','<WorkStatistics />',jsx,count=1);assert n==1;p.write_text(jsx)
print('Work totals:',{k:len(v) for k,v in summary.items()})
