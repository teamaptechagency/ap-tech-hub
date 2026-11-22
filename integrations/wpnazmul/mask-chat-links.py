from pathlib import Path
import sys
root=Path(sys.argv[1]);p=root/'integrations/wpnazmul/ui/components/admin-panels.jsx';s=p.read_text()
old='<p className="text-pre">{visible}</p>'
new='''<p className="text-pre">{visible.split(/(https:\\/\\/wpnazmul\\.com\\/#lead-chat=[A-Za-z0-9_-]+)/g).map((part,index)=>/^https:\\/\\/wpnazmul\\.com\\/#lead-chat=/.test(part)?<a key={index} href={part} target="_blank" rel="noopener noreferrer" className="masked-chat-link">Start live conversation ↗</a>:part)}</p>'''
if old in s:s=s.replace(old,new,1)
else:assert 'masked-chat-link' in s
p.write_text(s)
p=root/'integrations/wpnazmul/ui/hub-styles.css';s=p.read_text()
if '.masked-chat-link{' not in s:s+='\n.wpnazmul-surface .masked-chat-link{display:inline-flex;align-items:center;max-width:100%;padding:6px 10px;margin:4px 0;border:1px solid var(--line);border-radius:7px;color:var(--ink);background:var(--green-soft);font-weight:600;font-size:12px;text-decoration:none}.wpnazmul-surface .masked-chat-link:hover{text-decoration:underline}\n'
p.write_text(s)
print('Long invitation links display as a compact conversation action')
