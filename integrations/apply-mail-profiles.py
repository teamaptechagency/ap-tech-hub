from pathlib import Path
import shutil,time,subprocess
p=Path('/opt/aptech-agency/agency-server.mjs');s=p.read_text();backup=Path('/root/agency-server.before-mail-profiles-'+str(int(time.time()))+'.mjs');shutil.copy2(p,backup)
if "from './agency-mail-profiles.mjs'" not in s:
 s="import {profiledMailOperation} from './agency-mail-profiles.mjs';\n"+s
 needle='const leadGeneration=createLeadService('
 assert needle in s
 s=s.replace(needle,"const noReplyMail=createWebmail({directory:path.join(data,'no-reply'),sendOnly:true,replyTo:()=>mail.status('aptechagency.com').username||''});\n"+needle,1)
 start=s.index('const voice=createVoiceService(');end=s.index('\n',start)
 voice=s[start:end].replace("mail.status('aptechagency.com')","noReplyMail.status('aptechagency.com')").replace('await mail.operation(', 'await noReplyMail.operation(').replace('Configure AP Tech email','Configure AP Tech No-reply email')
 s=s[:start]+voice+s[end:]
 needle="const result=await mail.operation(p);if(['send','settings.save'].includes(p.op))audit('hub.mail.'+p.op);"
 assert needle in s
 s=s.replace(needle,"const result=await profiledMailOperation(p,{communication:mail,noreply:noReplyMail});if(['send','settings.save'].includes(p.op))audit('hub.mail.'+(p.profile||'communication')+'.'+p.op);")
p.write_text(s)
subprocess.run(['node','--check',str(p)],check=True)
print('Mail profiles wired. Backup:',backup)
