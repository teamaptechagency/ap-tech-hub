"""Prepare only the Work React page from current public content."""
from pathlib import Path
import json,re,subprocess,sys,tempfile
root=Path(sys.argv[1]);app=Path(sys.argv[2]);source=Path(sys.argv[3]);out=app/'work';out.mkdir(parents=True,exist_ok=True)
html=(root/'work/index.html').read_text()
businesses=json.loads((Path(__file__).with_name('work-business.json')).read_text())
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

# Keep actual screenshots and source metadata; rebuild only the card presentation.
counts={'all':len(projects)}
for item in re.findall(r'data-filter-item="([^\"]*)"',html):
 for category in set(item.split()):counts[category]=counts.get(category,0)+1
html=re.sub(r'(<button\b[^>]*data-filter="([^\"]+)"[^>]*>)([^<]+)(</button>)',lambda m:m[1]+m[3]+' <span class="work-filter-count">'+str(counts.get(m[2],0))+'</span>'+m[4],html)
def project_card(m):
 opening,body,closing=m.groups()
 cover=re.search(r'<div class="work-cover[^\"]*">[\s\S]*?</div>',body);assert cover
 title=re.search(r'<h3>([\s\S]*?)</h3>',body);assert title
 description=re.search(r'<h3>[\s\S]*?</h3><p>([\s\S]*?)</p>',body)
 def spans(cls):return re.findall(r'<span class="'+cls+r'[^\"]*">([\s\S]*?)</span>',body)
 scope=spans('project-scope');stacks=spans('project-stack');status=spans('project-version')+spans('website-status');screens=spans('work-screen-count');labels=spans('design-cover-label')
 image=re.sub(r'<span class="design-cover-label">[\s\S]*?</span>','',cover[0])
 if status:image=image[:-6]+'<div class="work-card-statuses">'+''.join('<span>'+x+'</span>' for x in status)+'</div></div>'
 kicker=' · '.join(dict.fromkeys(labels+scope))
 stacks=list(dict.fromkeys(stacks))
 if 'PHP' in stacks and 'Laravel' in stacks:stacks=[x for x in stacks if x not in ('PHP','Laravel')]+['PHP/Laravel']
 screen_label=re.sub(r'\s*&amp;\s*variations$','',screens[0]) if screens else ''
 slug=re.search(r'href="/work/([^/]+)/',opening)[1]
 assert slug in businesses, 'Missing business description: '+slug
 description_text=businesses[slug]
 # Business context belongs below the title; delivery and technology belong below the divider.
 work=description[1] if description else ' · '.join(scope)
 details=list(dict.fromkeys([work]+[x for x in stacks if x.casefold() not in work.casefold()]))
 footer='<div class="work-card-footer"><span class="work-card-technologies">'+' · '.join(x for x in details if x)+'</span>'+('' if not screens else '<span class="work-card-screens">'+screen_label+'</span>')+'</div>'
 return opening+image+'<div class="work-card-body"><h3>'+title[1]+'</h3><p class="work-card-description">'+description_text+'</p>'+footer+'</div>'+closing
html=re.sub(r'(<a class="work-card[^>]*>)([\s\S]*?)(</a>)',project_card,html)


from html import unescape
chosen=['dna-digital-consultancy','denistek-product-ui','footstep-online']
showcase=[]
for slug in chosen:
 card=next(m[0] for m in re.finditer(r'<a class="work-card[^>]*>[\s\S]*?</a>',html) if 'href="/work/'+slug+'/' in m[0])
 showcase.append({'href':'/work/'+slug+'/','title':unescape(re.search(r'<h3>([\s\S]*?)</h3>',card)[1]),'image':re.search(r'<img[^>]*src="([^\"]+)"',card)[1],'alt':unescape(re.search(r'<img[^>]*alt="([^\"]*)"',card)[1])})
(out/'work-showcase.json').write_text(json.dumps(showcase,indent=2))
def split_hero(m):
 section=m[0].replace('</nav>','</nav><div class="work-hero-layout"><div class="work-hero-copy">',1)
 return section.rsplit('</div></section>',1)[0]+'</div><div data-work-showcase></div></div></div></section>'
html=re.sub(r'<section class="page-hero work-page-hero">[\s\S]*?</section>',split_hero,html,count=1)

with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'index.html';p.write_text(html)
 subprocess.run([sys.executable,str(app.parent/'scripts/import-homepage.py'),str(p),str(out),'../interactions'],check=True)
p=out/'page.jsx';jsx=p.read_text();jsx="import WorkShowcase from '../../components/work-showcase';\nimport './work-cards.css';\nimport './work-hero.css';\nimport WorkStatistics from '../../components/work-statistics';\n"+jsx
jsx,n=re.subn(r'<div data-work-statistics=""></div>','<WorkStatistics />',jsx,count=1);assert n==1;jsx,n=re.subn(r'<div data-work-showcase=""></div>','<WorkShowcase />',jsx,count=1);assert n==1;p.write_text(jsx)
print('Work totals:',{k:len(v) for k,v in summary.items()})
