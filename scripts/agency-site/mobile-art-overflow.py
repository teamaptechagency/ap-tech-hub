from pathlib import Path
p=Path('/srv/astral/sites/aptechagency.com/public/assets/site.css')
css='\n/* Keep decorative hero transforms inside the mobile illustration. */\n@media(max-width:600px){.hero-art{overflow:hidden;overflow:clip}}\n'
if 'Keep decorative hero transforms' not in p.read_text(): p.write_text(p.read_text()+css)
p=Path('/opt/aptech-agency/agency-render.cjs')
s=p.read_text().replace('/assets/site.css?v=logo-ai-1','/assets/site.css?v=qa-mobile-1')
p.write_text(s)
