export type InsightVisual = 'PILLS'|'CARDS'|'COMPARE'|'TABLE'|'STEPS'|'CODE'|'TAKEAWAYS';
export type InsightPart = {kind:'markdown';text:string}|{kind:'visual';type:InsightVisual;rows:string[];text:string};

/** Markers are data, never HTML or executable instructions. */
export function parseInsightContent(source:string) {
  const lines=source.replace(/\r\n/g,'\n').split('\n');
  const parts:InsightPart[]=[];let plain:string[]=[];
  let ctaHeadline='',ctaText='';
  const flush=()=>{if(plain.some(x=>x.trim()))parts.push({kind:'markdown',text:plain.join('\n')});plain=[];};
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/^CTA HEADLINE:/.test(line)){flush();ctaHeadline=line.replace(/^CTA HEADLINE:\s*/,'').trim();continue;}
    if(/^CTA TEXT:/.test(line)){ctaText=line.replace(/^CTA TEXT:\s*/,'').trim();continue;}
    if(/^DISCLAIMER:/.test(line))continue;
    if(/^QUOTE:/.test(line)){plain.push('> '+line.replace(/^QUOTE:\s*/, '').replace(/^["“]|["”]$/g,''));continue;}
    const marker=line.match(/^\[(PILLS|CARDS|COMPARE|TABLE|STEPS|CODE)\]\s*(.*)$/);
    const takeaway=/^KEY TAKEAWAYS:\s*$/.test(line);
    if(!marker&&!takeaway){plain.push(line);continue;}
    flush();const type=(takeaway?'TAKEAWAYS':marker![1]) as InsightVisual;
    const rows:string[]=[];const raw:string[]=[];
    if(marker?.[2])rows.push(...marker[2].split(/\s*·\s*/).filter(Boolean));
    while(i+1<lines.length){
      const next=lines[i+1];
      if(/^(?:#{1,4}\s|\[(?:PILLS|CARDS|COMPARE|TABLE|STEPS|CODE)\]|QUOTE:|KEY TAKEAWAYS:|CTA HEADLINE:|CTA TEXT:|DISCLAIMER:)/.test(next))break;
      if(type==='CODE'){raw.push(next);i++;continue;}
      if(!next.trim()){i++;continue;}
      const item=next.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
      if(!item)break;
      rows.push(item[1]);i++;
    }
    // Incomplete blocks remain readable rather than silently losing text.
    if(rows.length||raw.length)parts.push({kind:'visual',type,rows,text:raw.join('\n').replace(/^```[^\n]*\n|\n```\s*$/g,'')});
  }
  flush();return {parts,ctaHeadline,ctaText};
}

export function normaliseInsightHeadings(content:string){
  // Older AI posts used only H3s. Promote those for the article outline.
  return /^##\s/m.test(content)?content:content.replace(/^###\s/gm,'## ');
}
