import test from 'node:test';
import assert from 'node:assert/strict';
import {INSIGHT_WRITING_INSTRUCTIONS,formatInsightArticle,validateInsightArticle} from '../integrations/insight-writing.mjs';

function fixture(){
 const intro=Array(24).fill('Your business reviews the problem carefully.').join(' ');
 return {title:'Why website care matters to your growing business',category:'AI Insights',summary:'Understand the warning signs and business impact before deciding what needs attention.',tags:['website-care','business-impact','maintenance'],content:[
  '## Recognise the warning signs',intro,'[PILLS]','- Slow pages','- Broken links','- Checkout errors','- Frequent downtime',
  '## Understand the common causes',intro,'[CARDS]','- **Ageing software** — Old software can introduce conflicts.','- **Security weaknesses** — Missing updates increase risk.','- **Weak backups** — Recovery can take longer.',
  'QUOTE: "Small warning signs deserve attention."',
  '## Weigh the trade-offs',intro,'[COMPARE]','- Cut upkeep / **Save money briefly** / Failures may cost more later.','- Plan upkeep / **Keep costs predictable** / Priorities guide your spending.',
  '## Consider the business impact',intro,'[TABLE]','- **Trust** — Visitors may lose confidence.','- **Sales** — Fewer visitors complete purchases.','- **Support** — Your team handles more complaints.',
  '## Conclusion','Recognise the warning signs. Discuss priorities before making changes.',
  'KEY TAKEAWAYS:','- Notice small warning signs','- Review the business impact','- Discuss your priorities',
  'CTA HEADLINE: Is website care on your mind?','CTA TEXT: Talk to our team about your business needs.'
 ].join('\n\n')};
}
test('writing brief includes the required markers and British spelling',()=>{
 for(const marker of ['[PILLS]','[CARDS]','[COMPARE]','[TABLE]','[STEPS]','[CODE]'])assert.ok(INSIGHT_WRITING_INSTRUCTIONS.includes(marker));
 assert.match(INSIGHT_WRITING_INSTRUCTIONS,/British spelling/);
});
test('structured article passes validation before image generation',()=>{
 const article=fixture();assert.equal(validateInsightArticle(article),article);
});
test('malformed blocks and missing takeaways are rejected',()=>{
 const article=fixture();assert.throws(()=>validateInsightArticle({...article,content:article.content.replace('- **Weak backups** — Recovery can take longer.','')}),/visual block/);
 assert.throws(()=>validateInsightArticle({...article,content:article.content.replace('- Discuss your priorities','')}),/takeaways/);
});
test('structured model fields become renderer markers and metadata stays outside the prose',()=>{
 const article=formatInsightArticle({title:'A title',sections:[{heading:'Signs',intro:'Notice what changes.',block:{type:'PILLS',items:['Slow pages','Broken links']}},{heading:'Causes',intro:'Understand the risks.',block:{type:'CARDS',items:['**Old software** — Conflicts grow.']}}],quote:'Notice what changes.',conclusion:'Discuss the risks.',takeaways:['Check the signs','Review the impact','Discuss priorities'],ctaHeadline:'Need help?',ctaText:'Talk to us.'});
 assert.match(article.content,/\[PILLS\]\n\n- Slow pages\n- Broken links/);
 assert.match(article.content,/## Conclusion/);assert.match(article.content,/KEY TAKEAWAYS:/);assert.match(article.content,/CTA HEADLINE: Need help\?/);
 assert.ok(!article.content.includes('TITLE:'));
});
