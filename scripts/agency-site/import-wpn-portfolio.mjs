// Import only the portfolio content already published on WP Nazmul.
import fs from 'node:fs';import crypto from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {execFileSync} from 'node:child_process';
import {createAgency} from '/opt/aptech-agency/agency.mjs';
const pid=execFileSync('systemctl',['show','wpnazmul-public','-p','MainPID','--value'],{encoding:'utf8'}).trim();
const env=Object.fromEntries(fs.readFileSync('/proc/'+pid+'/environ','utf8').split('\0').filter(v=>v.includes('=')).map(v=>[v.slice(0,v.indexOf('=')),v.slice(v.indexOf('=')+1)]));
const document=JSON.parse(fs.readFileSync(env.WPN_PUBLIC_PORTFOLIO_FILE,'utf8'));
const liveSource=execFileSync('systemctl',['show','wpnazmul-public','-p','WorkingDirectory','--value'],{encoding:'utf8'}).trim();
const portfolioCode=fs.readFileSync(liveSource+'/lib/portfolio.js','utf8');
const overrides=Object.fromEntries([...portfolioCode.matchAll(/'([a-z0-9-]+)':\s*'(https?:[^']+)'/g)].map(m=>[m[1],m[2]]));
const published=(document.content.projects||[]).filter(p=>p.published===true&&!['udonto-pathok-travel-journal-website','franco-bangla-academy-learning-platform'].includes(p.slug)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
const db=new DatabaseSync('/var/lib/aptech-agency/agency/agency.sqlite'),agency=createAgency({directory:'/var/lib/aptech-agency',seedPath:'/opt/aptech-agency/agency-seed.json'});
const before=db.prepare('SELECT * FROM content WHERE id=1').get(),existing=JSON.parse(before.published).projects||[];
const canonical=value=>{try{const u=new URL(value);return u.hostname.replace(/^www\./,'').toLowerCase()+u.pathname.replace(/\/$/,'');}catch{return '';}};
const projects=[];
for(const row of published){
 const d=row.data,url=overrides[row.slug]||d.live_url;if(!url||!/^https?:\/\//.test(url))continue;
 const image=row.slug==='ap-tech-agency-client-management-application'?'/images/ap-tech-homepage-20261121.webp':d.image;
 if(typeof image!=='string'||!/^\/(images|media|uploads|assets)\/[A-Za-z0-9_./-]+$/.test(image)||image.includes('..'))continue;
 let thumbnailId=existing.find(p=>canonical(p.url)===canonical(url)&&p.title?.trim().toLowerCase()===String(d.title).trim().toLowerCase())?.thumbnailId;
 if(!thumbnailId){const response=await fetch('https://wpnazmul.com'+image,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Published thumbnail unavailable: '+row.slug);const bytes=Buffer.from(await response.arrayBuffer());thumbnailId=agency.operation({op:'media.upload',name:(row.slug+'.webp').slice(0,100),base64:bytes.toString('base64')}).asset.id;}
 projects.push({id:('wpn-'+row.slug).slice(0,51)+'-'+crypto.createHash('sha256').update(row.slug).digest('hex').slice(0,8),title:String(d.title).slice(0,100),service:String(d.category||'Website Development').slice(0,100),url,thumbnailId,visible:true});
}
const backup='/root/agency-portfolio-before-wpn-'+Date.now()+'.json';fs.writeFileSync(backup,JSON.stringify({version:before.version,draftProjects:JSON.parse(before.draft).projects,publishedProjects:JSON.parse(before.published).projects}),{mode:0o600,flag:'wx'});
const merge=text=>{const data=JSON.parse(text),rows=data.projects||[];for(const p of projects){const same=rows.find(x=>x.id===p.id||(canonical(x.url)===canonical(p.url)&&x.title?.trim().toLowerCase()===p.title.trim().toLowerCase()));if(same){if(!same.thumbnailId)same.thumbnailId=p.thumbnailId;}else rows.push(p);}if(rows.length>80)throw Error('Portfolio limit exceeded');const featured=projects.map(p=>rows.find(x=>x.id===p.id||(canonical(x.url)===canonical(p.url)&&x.title?.trim().toLowerCase()===p.title.trim().toLowerCase()))).filter(Boolean);const featuredIds=new Set(featured.map(p=>p.id));data.projects=[...featured,...rows.filter(p=>!featuredIds.has(p.id))];return JSON.stringify(data);};
db.exec('BEGIN IMMEDIATE');try{const current=db.prepare('SELECT * FROM content WHERE id=1').get();db.prepare('INSERT INTO revisions VALUES(?,?,?)').run(crypto.randomBytes(16).toString('hex'),current.published,new Date().toISOString());db.prepare('UPDATE content SET draft=?,published=?,version=version+1,updated=? WHERE id=1').run(merge(current.draft),merge(current.published),new Date().toISOString());db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}finally{agency.close();db.close();}
console.log('Published WP projects processed:',projects.length,'Backup:',backup);
