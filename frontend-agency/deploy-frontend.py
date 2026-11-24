"""Route public pages to the supplied frontend; retain all existing API/admin handlers."""
from pathlib import Path
import re,shutil,time,subprocess
root=Path('/srv/astral/sites/aptechagency.com/releases/design-20261124/dist')
assert (root/'index.html').exists() and (root/'assets/support.js').exists()
p=Path('/etc/nginx/sites-available/astral-aptechagency.com');s=p.read_text()
backup='/root/aptech-nginx-before-frontend-'+str(int(time.time()))+'.conf'
shutil.copy2(p,backup)
s=s.replace('root /srv/astral/sites/aptechagency.com/public; index',str('root '+str(root)+'; index'))
s=re.sub(r'location = /(?:about/|services/|reviews/|contact/|privacy/|portfolio/)? \{ proxy_pass http://127\.0\.0\.1:8788/api/agency/public/page/[^}]+\}\n','',s)
s=s.replace('location / { try_files $uri $uri/ =404; }', '''location = /portfolio/ { return 308 /work/; }
location / { try_files $uri $uri/ @previous_public; }
location @previous_public { root /srv/astral/sites/aptechagency.com/public; try_files $uri $uri/ =404; }
error_page 404 /404.html;''')
p.write_text(s)
result=subprocess.run(['nginx','-t'],capture_output=True,text=True)
if result.returncode:
 shutil.copy2(backup,p)
 raise RuntimeError('Nginx validation failed; previous configuration restored')
subprocess.run(['systemctl','reload','nginx'],check=True)
print('New public frontend active. Backend/API configuration retained. Rollback:',backup)
