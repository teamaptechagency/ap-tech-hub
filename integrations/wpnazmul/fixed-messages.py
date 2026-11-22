from pathlib import Path
import sys
root=Path(sys.argv[1]);base=root/'integrations/wpnazmul/ui/components'
p=base/'admin-workspace.jsx';s=p.read_text()
s=s.replace('function Frame({error,children}){return <div className="wpnazmul-surface">','function Frame({error,children,view}){return <div className={"wpnazmul-surface"+(view===\'messages\'?\' wp-message-screen\':\'\')}>')
s=s.replace('<Title title="Public live chat"/>','').replace('<Title title="My PA"/>','')
s=s.replace('<Title title="Good communication. Better projects." copy="Your messages, project details, and feedback, together."/>','')
p.write_text(s)
p=base/'admin-panels.jsx';s=p.read_text()
start=s.index('  <div className="panel-body admin-thread-tools">')
end=s.index('  <div className="message-scroll admin-enquiry-log"',start)
tools=s[start:end]
tools=tools.replace('  <div className="panel-body admin-thread-tools">','<details className="thread-options"><summary aria-label="Conversation options" title="Conversation options">⋯</summary><div className="thread-options-popover">',1)
tools=tools.rsplit('</div>',1)[0]+'</div></details>'
tools=tools.replace('<section aria-label="Enquiry reference files">','{(references.length>0||referenceError)&&<section aria-label="Enquiry reference files">').replace('   </section>','   </section>}')
s=s[:start]+s[end:]
s=s.replace('<div className="conversation-meta"><span className="pill pill-gray">{entry.status}</span></div></header>','<div className="conversation-meta"><span className="pill pill-gray">{entry.status}</span>'+tools+'</div></header>',1)
s=s.replace("return <><div className=\"ws-title\"><div><h1>Inbox</h1><p>Website enquiries and lead email replies, in one place.</p></div>","return <><div className=\"ws-title inbox-compact-toolbar\"><span className=\"inbox-sync-status\" role=\"status\">{syncStatus}</span>")
s=s.replace('</button></div><p role="status" className="inbox-sync-status">{syncStatus}</p>','</button></div>',1)
old="<strong>{item.direction==='incoming'?entry.name:'You'} · {item.status==='received'?'Email reply':item.status==='draft'?'Draft':item.status==='accepted'?'Sent':'Delivery unconfirmed'}</strong>{item.subject&&<p><strong>{item.subject}</strong></p>}<p className=\"text-pre\">{item.body}</p>"
new='<MailBody body={item.body}/>'
assert old in s
s=s.replace(old,new)
helper='''
function MailBody({body}){
 const lines=String(body||'').split('\\n');
 const cut=lines.findIndex((line,index)=>index>0&&(/^\\s*>/.test(line)||/^On .{5,300}wrote:\\s*$/.test(line)||/^_{5,}$/.test(line)||/^-{2,}\\s*Original Message/i.test(line)));
 const visible=(cut<0?lines:lines.slice(0,cut)).join('\\n').trim();
 const quoted=cut<0?'':lines.slice(cut).join('\\n');
 return <><p className="text-pre">{visible}</p>{quoted&&<details className="quoted-mail"><summary>Show quoted email</summary><p className="text-pre">{quoted}</p></details>}</>;
}
'''
s=s.replace('function InboxThread(',helper+'\nfunction InboxThread(',1)
p.write_text(s)
p=root/'components/layout/admin-sidebar.tsx';s=p.read_text();s=s.replace('  {label:"Public live chat",href:"/wpnazmul/messages?tab=live",icon:MessageCircle},\n','');p.write_text(s)
print('Messages layout, compact options and quoted email updated')
p=base/'public-chat-inbox.jsx';s=p.read_text()
start=s.index('  return <div className="stack">')
s=s[:start]+'''  return <div className="public-live-inbox">
    {error && <p role="alert">{error}</p>}
    {threads?.length > 0 && <div className="live-chat-picker"><select aria-label="Conversation" disabled={busy} value={selected} onChange={event => { setChat(null); setError(''); setSelected(event.target.value); }}>
      <option value="">Choose a visitor</option>
      {threads.map(thread => <option key={thread.public_id} value={thread.public_id}>{thread.first_name} · {thread.status === 'waiting_human' ? 'Waiting' : 'Active'}</option>)}
    </select></div>}
    {chat ? <><header className="conversation-head"><div><strong>{chat.identity.first_name}</strong><p>{chat.identity.email}{chat.identity.whatsapp && ' · '+chat.identity.whatsapp}</p></div></header>
      <div className="message-scroll" role="log" aria-label="Public conversation" tabIndex={0}>
        {chat.messages.map(message => <div key={message.id} className={'message-group'+(message.author_type === 'guest'?'':' mine')}><div className="message-bubble"><p className="text-pre">{message.body}</p></div></div>)}
      </div>
      <form key={selected} className="message-compose" onSubmit={submit}>
        <label className="sr-only" htmlFor="public-chat-reply">Reply</label><textarea id="public-chat-reply" name="body" required maxLength={4000} rows={2} placeholder="Write a reply…"/>
        <div className="compose-toolbar"><small>Reply to this website visitor</small><button className="btn btn-dark btn-sm" disabled={busy}>{busy ? 'Sending…' : 'Send reply'}</button></div>
      </form>
    </> : <div className="live-chat-empty"><strong>{!threads?'Loading conversations…':threads.length?'Choose a conversation':'Your live inbox is clear'}</strong><p>{threads?.length?'Select a visitor to read and reply.':'New visitor messages will appear here automatically.'}</p></div>}
  </div>;
}
'''
p.write_text(s)
css=Path(sys.argv[2]).read_text();p=root/'integrations/wpnazmul/ui/hub-styles.css';s=p.read_text();marker='/* Keep the workspace fixed; scroll only lists and message history. */'
if marker in s:s=s[:s.index(marker)]
p.write_text(s+'\n'+css)
