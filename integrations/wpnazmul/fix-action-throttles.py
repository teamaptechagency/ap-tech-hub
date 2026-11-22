from pathlib import Path
import re,hashlib,shutil,time
p=Path('/srv/wpnazmul-staging/backend/routes/workspace.php');s=p.read_text();backup=Path('/root/wpn-rates-before-scoping-'+str(int(time.time()))+'.php');shutil.copy2(p,backup)
lines=[]
for line in s.splitlines(keepends=True):
 if re.search(r"throttle:\d+,\d+'",line):
  prefix='wpn-action-'+hashlib.sha256(line.strip().encode()).hexdigest()[:12]+':'
  line=re.sub(r"throttle:(\d+),(\d+)'",lambda m:'throttle:'+m[1]+','+m[2]+','+prefix+"'",line)
 lines.append(line)
p.write_text(''.join(lines));print('Action quotas retain their limits with separate counters. Rollback:',backup)
