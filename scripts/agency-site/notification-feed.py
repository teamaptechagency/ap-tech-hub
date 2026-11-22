from pathlib import Path
import shutil,time
backup=Path('/root/aptech-notification-feed-'+str(int(time.time())));backup.mkdir(mode=0o700)
for name in ['agency-chat.mjs','agency-server.mjs']:
    p=Path('/opt/aptech-agency')/name;shutil.copy2(p,backup/name)
    s=p.read_text()
    if name=='agency-chat.mjs' and "p.op==='notifications'" not in s:
        marker='function admin(p){'
        feed="""if(p.op==='notifications')return {notifications:all("SELECT m.id,m.cid,m.created,c.name FROM messages m JOIN conversations c ON c.id=m.cid WHERE m.actor='visitor' AND m.rowid=(SELECT MAX(v.rowid) FROM messages v WHERE v.cid=m.cid AND v.actor='visitor') ORDER BY m.created DESC LIMIT 60").map(r=>({key:r.id,title:'New visitor message',body:r.name,href:'/messages?tab=website&conversation='+encodeURIComponent(r.cid),createdAt:r.created}))};"""
        if marker not in s:raise RuntimeError('Chat insertion point changed')
        s=s.replace(marker,marker+feed,1)
    if name=='agency-server.mjs':
        s=s.replace("['state','read','send','conversation.update'].includes(p.op)","['state','read','notifications','send','conversation.update'].includes(p.op)")
        s=s.replace("if(!['state','read'].includes(p.op))audit('hub.chat.'+p.op)","if(!['state','read','notifications'].includes(p.op))audit('hub.chat.'+p.op)")
    p.write_text(s)
print('Read-only notification feed prepared. Backup:',backup)
