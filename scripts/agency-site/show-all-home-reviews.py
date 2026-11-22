from pathlib import Path
import shutil, time
p = Path('/opt/aptech-agency/agency-render.cjs')
s = p.read_text()
old = 'data.reviews.slice(0,2).map(reviewCard)'
if old in s:
    shutil.copy2(p, '/root/agency-render-before-all-reviews-' + str(int(time.time())) + '.cjs')
    p.write_text(s.replace(old, 'data.reviews.map(reviewCard)'))
print('Homepage renders every published review')
