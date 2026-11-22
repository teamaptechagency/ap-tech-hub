from pathlib import Path
import shutil,time
p=Path('/srv/wpnazmul-hub-login-20261122/next.config.mjs')
# Apply this adapter to an isolated copy passed on the command line.
import sys
p=Path(sys.argv[1])/'next.config.mjs';s=p.read_text()
s=s.replace("|| 'http://127.0.0.1:8027'","|| 'http://127.0.0.1:18027'")
p.write_text(s)
print('Public API fallback now targets the verified Laravel listener.')
