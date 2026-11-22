from pathlib import Path
import shutil, secrets, time, os
source=Path(__file__).parent
backend=Path('/srv/wpnazmul-staging/backend')
backup=Path('/root/aptech-wpn-integration-'+str(int(time.time())))
backup.mkdir(mode=0o700)
for p in [backend/'bootstrap/app.php',backend/'routes/web.php',backend/'.env',Path('/etc/aptech-hub/common.env')]:
    shutil.copy2(p,backup/(p.name+('-hub' if str(p).startswith('/etc/') else '')))
for name in ['HubApiAccess.php','HubCsrf.php']:
    shutil.copyfile(source/name,backend/'app/Http/Middleware'/name)
    os.chmod(backend/'app/Http/Middleware'/name,0o644)
shutil.copyfile(source/'HubInboxController.php',backend/'app/Http/Controllers/HubInboxController.php')
shutil.copyfile(source/'hub-inbox.php',backend/'routes/hub-inbox.php')
for p in [backend/'app/Http/Controllers/HubInboxController.php',backend/'routes/hub-inbox.php']: os.chmod(p,0o644)
p=backend/'routes/web.php'
if "require __DIR__.'/hub-inbox.php';" not in p.read_text(): p.write_text(p.read_text()+"\nrequire __DIR__.'/hub-inbox.php';\n")
shutil.copyfile(source/'hub-integration.php',backend/'config/hub-integration.php')
os.chmod(backend/'config/hub-integration.php',0o644)
p=backend/'bootstrap/app.php';s=p.read_text()
marker='$middleware->append(AcquisitionDatabase::class);'
new=marker+"\n        $middleware->prepend(\\App\\Http\\Middleware\\HubApiAccess::class);\n        $middleware->web(replace: [\\Illuminate\\Foundation\\Http\\Middleware\\ValidateCsrfToken::class => \\App\\Http\\Middleware\\HubCsrf::class]);"
if 'HubApiAccess::class' not in s:
    if marker not in s: raise RuntimeError('Bootstrap middleware marker missing')
    p.write_text(s.replace(marker,new,1))
hub=Path('/etc/aptech-hub/common.env')
existing=next((line.split('=',1)[1].strip().strip('"') for line in hub.read_text().splitlines() if line.startswith('WPN_HUB_TOKEN=')),None)
token=existing or secrets.token_hex(48)
for p in [hub,backend/'.env']:
    s='\n'.join(line for line in p.read_text().splitlines() if not line.startswith('WPN_HUB_TOKEN='))+'\nWPN_HUB_TOKEN='+token+'\n';p.write_text(s)
print('Backend bridge installed; private credential retained server-side. Rollback:',backup)
