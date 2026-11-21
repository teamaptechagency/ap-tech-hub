from pathlib import Path
p=Path('/opt/aptech-agency/agency-render.cjs')
s=p.read_text().replace('p.visible&&p.thumbnailUrl','p.visible')
old="'<article class=\"ap-project-card glass\"><img src=\"'+e(p.thumbnailUrl)+'\" alt=\"'+e(p.title)+' preview\" width=\"960\" height=\"600\" loading=\"lazy\" decoding=\"async\"><div>"
new="'<article class=\"ap-project-card glass\">'+(p.thumbnailUrl?'<img src=\"'+e(p.thumbnailUrl)+'\" alt=\"'+e(p.title)+' preview\" width=\"960\" height=\"600\" loading=\"lazy\" decoding=\"async\">':'<div class=\"ap-project-nameplate\" aria-hidden=\"true\">'+e(p.title)+'</div>')+'<div>"
if old not in s and 'ap-project-nameplate' not in s: raise RuntimeError('Portfolio card template changed')
s=s.replace(old,new).replace('/assets/site.css?v=qa-mobile-1','/assets/site.css?v=portfolio-restored-1')
p.write_text(s)
p=Path('/opt/aptech-agency/agency.mjs');s=p.read_text()
old="for(const p of parsed.projects)if(p.visible&&(!p.thumbnailId||!media(p.thumbnailId)))fail('Upload a thumbnail for each visible portfolio project before publishing.');"
s=s.replace(old,"for(const p of parsed.projects)if(p.thumbnailId&&!media(p.thumbnailId))fail('Choose an uploaded portfolio thumbnail.');")
p.write_text(s)
p=Path('/srv/astral/sites/aptechagency.com/public/assets/site.css')
if '.ap-project-nameplate{' not in p.read_text():
    p.write_text(p.read_text()+'\n.ap-project-card>.ap-project-nameplate{aspect-ratio:8/5;display:flex;align-items:center;justify-content:center;padding:28px;text-align:center;font-size:clamp(24px,3vw,42px);font-weight:600;letter-spacing:-1px;color:#f4bb81;background:radial-gradient(ellipse at 70% 25%,#34415b,#152133 75%)}\n')
