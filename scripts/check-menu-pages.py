import re
from pathlib import Path
root=Path.cwd()
patterns=[]
for page in (root/'app').rglob('page.*'):
 if page.suffix not in ['.js','.jsx','.ts','.tsx']:continue
 pattern=''
 for segment in page.relative_to(root/'app').parts[:-1]:
  if segment.startswith(('(','@')):continue
  if segment.startswith('[[...'):pattern+='(?:/.*)?'
  elif segment.startswith('[...'):pattern+='/.+'
  elif segment.startswith('['):pattern+='/[^/]+'
  else:pattern+='/'+re.escape(segment)
 patterns.append(re.compile('^'+(pattern or '/')+'/?$'))
paths=set()
for file in (root/'components/layout').glob('*sidebar.tsx'):
 paths.update(x.split('?')[0] for x in re.findall(r'href:\s*["\']([^"\']+)',file.read_text()) if x.startswith('/'))
missing=[p for p in sorted(paths) if not any(pattern.fullmatch(p) for pattern in patterns)]
print('Menu targets:',len(paths),'page source matches:',len(paths)-len(missing))
if missing:print('Missing page targets:',missing)
