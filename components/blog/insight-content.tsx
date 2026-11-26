import { FileText, Star } from 'lucide-react';
import { BlogContent, Inline } from './blog-content';
import { parseBlogContent } from '@/lib/blog-content';
import { parseInsightContent, type InsightVisual } from '@/lib/insight-content';

function Text({text}:{text:string}){const block=parseBlogContent(text)[0];return block?.kind==='paragraph'?<Inline parts={block.content}/>:<>{text}</>;}
function Visual({type,rows,text}:{type:InsightVisual;rows:string[];text:string}){
  if(type==='CODE')return <pre className="insight-code"><code>{text}</code></pre>;
  if(type==='PILLS')return <ul className="insight-symptoms">{rows.map((x,i)=><li key={i}><Text text={x}/></li>)}</ul>;
  if(type==='STEPS')return <ol className="insight-numbered">{rows.map((x,i)=><li key={i}><Text text={x}/></li>)}</ol>;
  if(type==='TAKEAWAYS')return <aside className="insight-takeaways"><h3><span className="insight-icon"><Star aria-hidden="true"/></span>Key takeaways</h3><ul>{rows.map((x,i)=><li key={i}><span aria-hidden="true">✓</span><Text text={x}/></li>)}</ul></aside>;
  if(type==='COMPARE')return <div className="insight-tradeoffs">{rows.map((x,i)=>{const [label,title,...rest]=x.split(/\s*\/\s*/);return <div key={i}><p className="journal-eyebrow"><Text text={label}/></p><h3><Text text={title||label}/></h3><p><Text text={rest.join(' / ')}/></p></div>;})}</div>;
  const entries=rows.map(x=>{const match=x.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.*)$/);return match?{title:match[1],text:match[2]}:{title:'',text:x};});
  if(type==='TABLE')return <dl className="insight-impact">{entries.map((x,i)=><div key={i}><dt><Text text={x.title}/></dt><dd><Text text={x.text}/></dd></div>)}</dl>;
  return <div className="insight-cause-grid">{entries.map((x,i)=><div className="insight-cause" key={i}><span className="insight-icon"><FileText aria-hidden="true"/></span>{x.title&&<h3><Text text={x.title}/></h3>}<p><Text text={x.text}/></p></div>)}</div>;
}
export function InsightContent({content}:{content:string}){
  const {parts}=parseInsightContent(content);
  return <div className="insight-prose insight-care-story insight-structured">{parts.map((part,index)=>part.kind==='markdown'?<BlogContent key={index} content={part.text}/>:<Visual key={index} {...part}/>)}</div>;
}
