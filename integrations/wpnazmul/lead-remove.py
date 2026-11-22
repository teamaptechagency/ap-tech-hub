"""Extend the existing owner-only archive operation to discovered leads."""
from pathlib import Path
import shutil,time
p=Path('/srv/wpnazmul-staging/backend/app/Workspace/LeadGeneration.php')
s=p.read_text()
old="if (!$lead || $lead->status === 'discovered') {\n                throw new WorkspaceError('lead_not_found','Saved lead not found.',404);\n            }"
new="if (!$lead) {\n                throw new WorkspaceError('lead_not_found','Lead not found.',404);\n            }\n            if ($lead->status === 'sending') {\n                throw new WorkspaceError('lead_sending','Wait for the current email send to finish before removing this lead.',409);\n            }"
if new not in s:
    if old not in s:raise RuntimeError('Archive operation changed; inspect before applying')
    backup=Path('/root/wpn-lead-remove-'+str(int(time.time()))+'.php')
    shutil.copy2(p,backup);p.write_text(s.replace(old,new,1));print('Archive operation updated. Backup:',backup)
else:print('Archive operation already updated')
