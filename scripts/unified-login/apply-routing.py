from pathlib import Path
import shutil,time
backup=Path('/root/aptech-unified-login-'+str(int(time.time())))
backup.mkdir(mode=0o700)
portal=Path('/etc/nginx/sites-enabled/astral-portal.aptechagency.com').resolve()
wp=Path('/etc/nginx/sites-enabled/astral-wpnazmul.com').resolve()
for p in [portal,wp]: shutil.copy2(p,backup/p.name)
s=portal.read_text()
marker='# Installed agents keep using their bearer API without a cross-host redirect.'
start=s.index(marker) if marker in s else s.index('location = / {')
end=s.rfind('\n}')
compat='''# Installed agents keep using their bearer API without a cross-host redirect.
location ~ ^/api/(device-agent|device-attendance|workstation|workstation-chat|workstation-support|business-office|blog-image)$ {
proxy_pass http://127.0.0.1:3311; proxy_http_version 1.1;
proxy_set_header Host manage.aptechagency.com; proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_read_timeout 300s; client_max_body_size 64m;
}
location / { return 308 https://manage.aptechagency.com$request_uri; }
'''
portal.write_text(s[:start]+compat+s[end:])
s=wp.read_text()
if '# Unified Hub entry' not in s:
    marker='location / { proxy_pass'
    routes='''# Unified Hub entry: web login belongs to manage.aptechagency.com.
location = /admin { return 308 https://manage.aptechagency.com/wpnazmul/overview; }
location = /admin/login { return 308 https://manage.aptechagency.com/login; }
location = /admin/acquisition { return 308 https://manage.aptechagency.com/wpnazmul/leads; }
location ~ ^/admin/client-projects(?:/(.*))?$ { return 308 https://manage.aptechagency.com/wpnazmul/orders/$1$is_args$args; }
location ~ ^/admin/(.*)$ { return 308 https://manage.aptechagency.com/wpnazmul/$1$is_args$args; }
location = /client { return 308 https://manage.aptechagency.com/login; }
location = /client/login { return 308 https://manage.aptechagency.com/login; }
location = /client/register { return 308 https://manage.aptechagency.com/register; }
'''
    if marker not in s:raise RuntimeError('WP routing insertion point missing')
    s=s.replace(marker,routes+marker,1);wp.write_text(s)
print('Routing prepared; run nginx -t before reload. Rollback:',backup)
