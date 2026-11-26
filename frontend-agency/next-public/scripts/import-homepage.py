"""Convert the captured homepage DOM to real JSX, retaining its structure and assets.
Only generates the homepage; never modifies the original public directory.
"""
from html.parser import HTMLParser
from pathlib import Path
import json,re,sys,hashlib
class Node:
 def __init__(self,tag='',attrs=None):self.tag=tag;self.attrs=dict(attrs or []);self.children=[]
class Parser(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root]
 def handle_starttag(self,t,a):
  n=Node(t,a);self.stack[-1].children.append(n)
  if t not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.stack.append(n)
 def handle_startendtag(self,t,a):self.handle_starttag(t,a);self.handle_endtag(t)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,d):self.stack[-1].children.append(d)
def find(n,tag):
 if isinstance(n,str):return None
 if n.tag==tag:return n
 for child in n.children:
  result=find(child,tag)
  if result:return result
names={'class':'className','for':'htmlFor','tabindex':'tabIndex','crossorigin':'crossOrigin','srcset':'srcSet','viewbox':'viewBox','readonly':'readOnly','autoplay':'autoPlay','playsinline':'playsInline','maxlength':'maxLength','colspan':'colSpan','rowspan':'rowSpan','allowfullscreen':'allowFullScreen','frameborder':'frameBorder','fetchpriority':'fetchPriority','datetime':'dateTime','accept-charset':'acceptCharset','contenteditable':'contentEditable','spellcheck':'spellCheck'}
bools={'disabled','multiple','required','hidden','open','readOnly','autoPlay','controls','loop','muted','playsInline','noValidate','allowFullScreen'}
def attr(k,v):
 k=names.get(k,k)
 if k.startswith('on'):raise ValueError('Inline event requires React conversion: '+k)
 if '-' in k and not k.startswith(('data-','aria-')):k=re.sub(r'-([a-z])',lambda m:m[1].upper(),k)
 if k=='style':
  values={}
  for part in v.split(';'):
   if ':' not in part:continue
   a,b=part.split(':',1);a=a.strip();values[a if a.startswith('--') else re.sub(r'-([a-z])',lambda m:m[1].upper(),a)]=b.strip()
  return ' style={'+json.dumps(values)+'}'
 if k=='checked':return ' defaultChecked'
 if k in bools:return ' '+k+'={true}'
 return ' '+k+'='+json.dumps(v if v is not None else '')
def jsx(n):
 if isinstance(n,str):return '{'+json.dumps(n)+'}' if n else ''
 if n.tag=='script':return ''
 attrs=''.join(attr(k,v) for k,v in n.attrs.items())
 if n.tag=='style':return '<style'+attrs+' dangerouslySetInnerHTML={{__html:'+json.dumps(''.join(n.children))+'}} />'
 if n.tag=='textarea':return '<textarea'+attrs+' defaultValue={'+json.dumps(''.join(n.children))+'} />'
 if n.tag in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:return '<'+n.tag+attrs+' />'
 return '<'+n.tag+attrs+'>'+''.join(jsx(c) for c in n.children)+'</'+n.tag+'>'
source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
raw=source.read_text();p=Parser();p.feed(raw);head=find(p.root,'head');body=find(p.root,'body')
scripts=[n.attrs['src'] for n in body.children if isinstance(n,Node) and n.tag=='script' and 'src' in n.attrs]
(out/'scripts.json').write_text(json.dumps(scripts,indent=2))
styles=[n for n in head.children if isinstance(n,Node) and n.tag=='link' and n.attrs.get('rel') in ('stylesheet','preload','icon')]
title=''.join(find(head,'title').children);desc=next(n.attrs['content'] for n in head.children if isinstance(n,Node) and n.tag=='meta' and n.attrs.get('name')=='description')
meta={'title':title,'description':desc,'robots':{'index':False,'follow':False},'alternates':{'canonical':'https://aptechagency.com/'}}
init="(()=>{let t='light';try{if(localStorage.getItem('ap-tech-theme')==='dark')t='dark'}catch{}document.documentElement.dataset.theme=t})();"
layout='export const metadata='+json.dumps(meta)+';\nexport default function Layout({children}){return <html lang="en" suppressHydrationWarning><head>'+''.join(jsx(n) for n in styles)+'<script dangerouslySetInnerHTML={{__html:'+json.dumps(init)+'}} /></head><body'+''.join(attr(k,v) for k,v in body.attrs.items())+' suppressHydrationWarning>{children}</body></html>;}\n'
(out/'layout.jsx').write_text(layout)
(out/'page.jsx').write_text("import ExistingInteractions from './interactions';\nexport default function HomePage(){return <>"+''.join(jsx(c) for c in body.children)+"<ExistingInteractions /></>;}\n")
(out/'baseline.json').write_text(json.dumps({'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'source':'captured live homepage','scripts':len(scripts),'title':title},indent=2))
print('Generated Next.js homepage JSX from live DOM; scripts:',len(scripts))
