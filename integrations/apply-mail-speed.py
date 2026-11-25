from pathlib import Path
import shutil,time,subprocess
p=Path('/opt/aptech-agency/agency-server.mjs')
s=p.read_text();old="'folders','list','read','send'"
if old in s:
 shutil.copy2(p,'/root/agency-server.before-mail-speed-'+str(int(time.time()))+'.mjs')
 p.write_text(s.replace(old,"'folders','list','read','send','open'"))
subprocess.run(['node','--check',str(p)],check=True)
