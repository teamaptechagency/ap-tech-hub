"""Run on the VPS after the Hub candidate build succeeds; preserves rollback copies."""
from pathlib import Path
import shutil, subprocess, time

candidate = Path('/srv/astral/sites/manage.aptechagency.com/releases/aptech-hub-unified-website')
assert (candidate / '.next/BUILD_ID').is_file()
stamp = str(int(time.time()))
dropin = Path('/etc/systemd/system/aptech-manage.service.d/99-openai-keys.conf')
shutil.copy2(dropin, '/root/manage-before-unified-' + stamp + '.conf')
lines = dropin.read_text().splitlines()
assert any(line.startswith('WorkingDirectory=') for line in lines)
dropin.write_text('\n'.join('WorkingDirectory=' + str(candidate) if line.startswith('WorkingDirectory=') else line for line in lines) + '\n')
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'restart', 'aptech-manage'], check=True)

# Retire both the UI and the old separate login API. Keep public chat and bridges.
replacements = {
    'location = /admin { proxy_pass http://127.0.0.1:8788/agency-admin; proxy_set_header Host $host; }': 'location = /admin { return 308 https://manage.aptechagency.com/website-management; }',
    'location = /admin/ { return 308 /admin; }': 'location = /admin/ { return 308 https://manage.aptechagency.com/website-management; }',
    'location ^~ /agency-admin-assets/ { proxy_pass http://127.0.0.1:8788; proxy_set_header Host $host; }': 'location ^~ /agency-admin-assets/ { return 410; }',
    'location ^~ /agency-api/admin/ { proxy_pass http://127.0.0.1:8788/api/agency/admin/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-Proto $scheme; client_max_body_size 6m; proxy_buffering off; proxy_read_timeout 310s; }': 'location ^~ /agency-api/admin/ { return 410; }',
}
for name in ['/opt/astral-panel/deploy/lifecycle.py', '/etc/nginx/sites-available/astral-aptechagency.com']:
    p = Path(name)
    old = p.read_text()
    updated = old
    for before, after in replacements.items():
        updated = updated.replace(before, after)
    assert updated != old, 'Expected legacy routes were not found: ' + name
    backup = '/root/' + p.name + '-before-unified-' + stamp
    shutil.copy2(p, backup)
    p.write_text(updated)
    if name.endswith('.py'):
        compile(updated, name, 'exec')
subprocess.run(['nginx', '-t'], check=True)
subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
subprocess.run(['systemctl', 'restart', 'astral-agent'], check=True)
print('Unified workspace active; rollback stamp:', stamp)
