// Merge existing published feedback only; never generate reviews or ratings.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const file=process.argv[2];
if(!file?.startsWith('/srv/')||!file.endsWith('/portfolio.json'))throw Error('Expected published portfolio file');
const doc=JSON.parse(fs.readFileSync(file,'utf8'));
const db=new DatabaseSync('/var/lib/aptech-agency/agency/agency.sqlite');
const row=db.prepare('SELECT * FROM content WHERE id=1').get();
const ap=JSON.parse(row.published);
const key=name=>String(name).toLowerCase().replace(/[^a-z0-9]/g,'');
const merged=new Map();
for(const r of ap.reviews||[])merged.set(key(r.handle),{name:r.handle,country:r.country,text:r.summary||r.quote,rating:r.rating,platform:r.platform});
for(const r of doc.content.reviews||[]){if(r.published!==true||!r.data?.description?.trim())continue;const d=r.data;merged.set(key(d.author||d.title),{name:d.author||d.title,country:d.location||'',text:d.description,rating:d.rating,platform:'Client feedback'});}
const reviews=[...merged.values()];
if(reviews.some(r=>!r.name||!r.text||!Number.isInteger(r.rating)||r.rating<1||r.rating>5||r.text.length>600))throw Error('Published review needs manual validation');
const stamp=Date.now();
fs.writeFileSync('/root/reviews-before-merge-'+stamp+'.json',JSON.stringify({wp:doc.content.reviews,apDraft:JSON.parse(row.draft).reviews,apPublished:ap.reviews}),{mode:0o600,flag:'wx'});
const convert=text=>{const d=JSON.parse(text);d.reviews=reviews.map(r=>({rating:r.rating,handle:r.name,country:r.country,quote:r.text.slice(0,250),summary:r.text,initial:Array.from(r.name)[0].toUpperCase(),platform:r.platform}));return JSON.stringify(d);};
const wp=reviews.map((r,i)=>{const original=(doc.content.reviews||[]).find(x=>key(x.data?.author||x.data?.title)===key(r.name));return {...original,slug:original?.slug||'shared-'+key(r.name),published:true,sort_order:i,data:{...original?.data,title:r.name,author:r.name,location:r.country,rating:r.rating,description:r.text}};});
doc.content.reviews=wp;
db.exec('BEGIN IMMEDIATE');
try{db.prepare('INSERT INTO revisions VALUES(?,?,?)').run(crypto.randomBytes(16).toString('hex'),row.published,new Date().toISOString());db.prepare('UPDATE content SET draft=?,published=?,version=version+1,updated=? WHERE id=1').run(convert(row.draft),convert(row.published),new Date().toISOString());fs.writeFileSync(file+'.reviews-next',JSON.stringify(doc));fs.renameSync(file+'.reviews-next',file);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}finally{db.close();}
console.log('Published reviews on each site:',reviews.length);
