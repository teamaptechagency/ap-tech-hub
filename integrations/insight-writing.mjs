export const INSIGHT_WRITING_INSTRUCTIONS = `AP Tech Agency — Insights writing instructions
Write for busy small and medium business owners and their teams, not technical specialists.
Voice: confident, direct, warm. Use we, never I. Address you and your business.
Use short sentences, one idea each, usually under 20 words. Explain technical terms immediately.
British spelling: optimise, recognise, catalogue, prioritise, summarise.
No hype words, emoji, exclamation marks, invented statistics, percentages, client names, quotes, case studies, sources or promises. Leave out facts needing unsupported sources.
Write 500–800 words. Title: sentence case, clear benefit or question, 6–12 words.
Category: AI Insights or Guide. Tags: 3–5 lowercase hyphenated strings.
Structure, always in order:
Lead: 1–2 sentences naming the problem and what the reader gets. Return this in summary.
4–6 short, specific H2 sections. Each has a 1–3 sentence introduction then ONE visual block. Vary blocks.
After section 2 or 3, include QUOTE: followed by a key line from this article under 15 words. Never attribute it to a person.
Then H2 Conclusion: 2–3 sentences, no new ideas.
Then KEY TAKEAWAYS: exactly 3 bullet items, each under 12 words.
Then CTA HEADLINE: one question; CTA TEXT: one sentence. Button is always Start a project.
Visual markers must be on their own line, followed by Markdown list rows:
[PILLS]: 4–6 items, each 1–3 words.
[CARDS]: exactly 3 items, each **Title** (2–5 words) — one sentence.
[COMPARE]: exactly 2 items, each label (2 words) / **headline** (3–5 words) / one sentence.
[TABLE]: 3–5 items, each **one-word label** — one sentence.
[STEPS]: 3–5 numbered short actions, each starting with a verb.
[CODE]: technical posts only; fenced code under 8 lines. Never executable scripts, credentials or unsafe instructions.
End sections with something practical. Start actions with verbs. No raw HTML.
Choose service-related problems, symptoms, causes, trade-offs and business impact. Planning actions are allowed; avoid detailed implementation tutorials and solution promises.
SEO: natural search intent, descriptive headings and primary keyword without stuffing. Do not repeat prior topics.
Return JSON, not the labelled outer template: title, category, summary (lead), content (Markdown with exact markers above), primaryTag, keywords (four), tags, imagePrompt, alt. Do not duplicate title, category, tags or lead in content. Omit READ TIME; the publisher calculates it. Omit DISCLAIMER from content; the site adds its transparent AI disclosure.
Example visual block:
[CARDS]
- **Ageing software** — Skipped updates lead to conflicts and broken features.
- **Security weaknesses** — Out-of-date code increases the risk of unauthorised access.
- **Weak backups** — Recovery takes longer and costs more without them.
`;

const words = text => text.replace(/\*|\[[A-Z ]+\]|^#+/gm, '').trim().split(/\s+/).filter(Boolean);
const str={type:'string'};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const INSIGHT_JSON_FORMAT={type:'json_schema',name:'aptech_insight',strict:true,schema:object({
 title:str,category:{type:'string',enum:['AI Insights','Guide']},summary:str,
 sections:{type:'array',minItems:4,maxItems:6,items:object({heading:str,intro:{type:'string',description:'Three clear sentences, around 45–60 words, providing substantive context without invented facts.'},block:object({type:{type:'string',enum:['PILLS','CARDS','COMPARE','TABLE','STEPS','CODE']},items:{type:'array',minItems:2,maxItems:6,items:str,description:'Use the exact row counts and item syntax required for this block type.'}})})},
 quote:str,conclusion:str,takeaways:{type:'array',minItems:3,maxItems:3,items:str},ctaHeadline:str,ctaText:str,
 primaryTag:str,keywords:{type:'array',minItems:4,maxItems:4,items:str},tags:{type:'array',minItems:3,maxItems:5,items:str},imagePrompt:str,alt:str,
})};
export function formatInsightArticle(article){
 if(!Array.isArray(article?.sections))return article;
 const sections=article.sections.flatMap((section,index)=>[
  '## '+section.heading,section.intro,'['+section.block.type+']',
  section.block.type==='CODE'?'```\n'+section.block.items.join('\n')+'\n```':section.block.items.map((x,i)=>(section.block.type==='STEPS'?`${i+1}. `:'- ')+x).join('\n'),
  ...(index===1?['QUOTE: "'+article.quote.replace(/^"|"$/g,'')+'"']:[]),
 ]);
 return {...article,content:[...sections,'## Conclusion',article.conclusion,'KEY TAKEAWAYS:',article.takeaways.map(x=>'- '+x).join('\n'),'CTA HEADLINE: '+article.ctaHeadline,'CTA TEXT: '+article.ctaText].join('\n\n')};
}
export function validateInsightArticle(article) {
  if (typeof article?.content === 'string' && !article.content.includes('\n') && article.content.includes('\\n')) article.content=article.content.replaceAll('\\n','\n');
  if (typeof article?.category === 'string') {
    const category=article.category.toLowerCase().replace(/[-_]/g,' ').trim();
    if(category==='ai insights')article.category='AI Insights';
    if(category==='guide')article.category='Guide';
  }
  if (typeof article?.content === 'string') article.content = article.content.replace(/^##\s+conclusion\s*$/gim, '## Conclusion');
  const content = article?.content;
  if (typeof content !== 'string') throw Error('AI returned incomplete article data.');
  const count = words((article.summary || '') + ' ' + content).length;
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)];
  const conclusion = headings.findIndex(x => x[1].trim() === 'Conclusion');
  if (count < 500 || count > 800 || words(article.title || '').length < 6 || words(article.title || '').length > 12 || conclusion < 4 || conclusion > 6 || conclusion !== headings.length - 1) throw Error(`AI article does not match the required length or section structure (words=${count}, titleWords=${words(article.title || '').length}, sectionsBeforeConclusion=${conclusion}, H2s=${headings.length}).`);
  const quote = content.match(/^QUOTE:\s*(.+)$/m);
  const takeaways = content.match(/^KEY TAKEAWAYS:\s*\n([\s\S]*?)(?=^CTA HEADLINE:|$(?![\s\S]))/m);
  const bullets = takeaways?.[1].split('\n').filter(x => /^[-*]\s/.test(x)) || [];
  if (!quote || words(quote[1]).length >= 15 || bullets.length !== 3 || bullets.some(x => words(x.replace(/^[-*]\s*/, '')).length >= 12) || !/^CTA HEADLINE:\s*.+\?\s*$/m.test(content) || !/^CTA TEXT:\s*.+$/m.test(content)) throw Error('AI article is missing its quote, takeaways or contact invitation.');
  const types = ['PILLS','CARDS','COMPARE','TABLE','STEPS','CODE'];
  for (let i = 0; i < conclusion; i++) {
    const section = content.slice(headings[i].index, headings[i+1].index);
    const markers = [...section.matchAll(/^\[(PILLS|CARDS|COMPARE|TABLE|STEPS|CODE)\]\s*$/gm)];
    if (markers.length !== 1) throw Error('AI article needs one visual block per section.');
    const type = markers[0][1];
    const rows = section.slice(markers[0].index + markers[0][0].length).split('\n').filter(x => /^\s*(?:[-*]|\d+[.)])\s/.test(x));
    const limits = {PILLS:[4,6],CARDS:[3,3],COMPARE:[2,2],TABLE:[3,5],STEPS:[3,5]};
    if (types.includes(type) && type !== 'CODE') {
      const [min,max] = limits[type];
      if (rows.length < min || rows.length > max || (type === 'PILLS' && rows.some(x => words(x.replace(/^\s*[-*]\s*/, '')).length > 3))) throw Error('AI article has an invalid visual block.');
    } else if (section.slice(markers[0].index).split('\n').filter(x=>x.trim() && !x.startsWith('```') && !x.startsWith('[CODE]') && !x.startsWith('QUOTE:')).length >= 8) throw Error('AI code example is too long.');
  }
  if (!['AI Insights','Guide'].includes(article.category) || !Array.isArray(article.tags) || article.tags.length < 3 || article.tags.length > 5 || article.tags.some(x => typeof x !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x))) throw Error('AI article has invalid category or tags.');
  return article;
}
