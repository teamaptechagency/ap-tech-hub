// Apply appearance only. No selectors, dimensions, spacing, content or HTML are changed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tokens=JSON.parse(fs.readFileSync(path.join(root,'design-system/tokens.json'),'utf8'));
const palette=tokens.color.tokens.filter(t=>typeof t.value==='string').map(t=>t.value.toLowerCase());
const rgb=h=>{h=h.slice(1);if(h.length===3||h.length===4)h=h.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
const fixed={'#172b3a':'#272a23','#112127':'#12150d','#1b2e34':'#1b1f14','#1b2d32':'#1b1f14','#293f25':'#283218','#c5a46d':'#e8a317','#556b2f':'#556b2f','#3c5128':'#455727','#f6f5f0':'#f7f8f5','#bed49e':'#b3c38a'};
export function recolor(source){return source.replace(/#[a-f\d]{3,8}\b/gi,raw=>{const c=raw.toLowerCase();if(![4,5,7,9].includes(c.length))return raw;const expanded=c.length<6?'#'+c.slice(1).split('').map(x=>x+x).join(''):c;const base=expanded.slice(0,7),alpha=expanded.slice(7);const p=rgb(base);let nearest=['#12150d','#1b1f14','#232918','#343b29','#f1f3ec','#a7ad9c','#2a3320'].includes(base)?base:fixed[base];if(!nearest){let score=Infinity;for(const value of palette){const q=rgb(value),d=p.reduce((sum,v,i)=>sum+(v-q[i])**2,0);if(d<score){score=d;nearest=value;}}}return nearest+alpha;});}
export function applyAppearance(source,{main=false}={}){
 let s=recolor(source).replaceAll('Manrope','Roboto').replaceAll('/assets/manrope.woff2','/assets/roboto.ttf').replace("format('woff2')","format('truetype')");
 // Preserve existing responsive sizes and line heights so the composition stays intact.
 s=s.replace(/font-weight:(550|650|750)\b/g,(_,n)=>'font-weight:'+(Number(n)>=650?700:500));
 if(main&&!s.includes('AP Tech token aliases'))s+=`\n/* AP Tech token aliases: colors/type only; existing layout and type sizes retained. */\n:root{--olive:#556b2f;--olive-deep:#455727;--navy:#272a23;--gold:#e8a317;--paper:#f7f8f5;--surface:#f7f8f5;--card:#ffffff;--ink:#000000;--muted:#565c4e;--line:#dde0d6;--soft:#e8edda;--accent:#46621f;--hero:#556b2f;--nav:#ffffff;--action:#556b2f;--action-ink:#ffffff;font-family:Roboto,system-ui,-apple-system,'Segoe UI',Arial,sans-serif}\nhtml[data-theme=dark]{--surface:#12150d;--card:#1b1f14;--ink:#f1f3ec;--muted:#a7ad9c;--line:#343b29;--soft:#232918;--accent:#aecb7a;--hero:#283218;--nav:#1b1f14;--action:#b3c38a;--action-ink:#12150d}\nh1,h2{font-weight:700}h3,h4{font-weight:500}em{font-family:inherit}button,.button{font-weight:500}.button.gold{background:var(--action);color:var(--action-ink)}.button.gold:hover{background:#455727;color:#fff}\n`;
 return s;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const target=process.argv[2]||path.join(root,'dist');for(const name of ['site.css','livechat-adapter.css','service-packages.css']){const p=path.join(target,name);if(fs.existsSync(p))fs.writeFileSync(p,applyAppearance(fs.readFileSync(p,'utf8'),{main:name==='site.css'}));}
 console.log('Applied typography and color tokens only.');
}
