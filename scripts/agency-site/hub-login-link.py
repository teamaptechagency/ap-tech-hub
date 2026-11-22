from pathlib import Path
p=Path('/opt/aptech-agency/agency-render.cjs')
s=p.read_text()
old='<a class="header-cta" href="/contact/">Let’s talk '
new='<a class="header-cta" href="https://manage.aptechagency.com/login">Login '
if old not in s and new not in s: raise RuntimeError('Header CTA not found')
p.write_text(s.replace(old,new))
