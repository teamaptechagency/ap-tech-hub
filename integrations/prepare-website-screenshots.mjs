import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire('/srv/astral/sites/manage.aptechagency.com/releases/aptech-hub-olive-final/package.json');
const sharp=require('sharp');
const source=process.argv[2],output=process.argv[3],manifest=JSON.parse(fs.readFileSync(process.argv[4],'utf8'));
fs.mkdirSync(output,{recursive:true});const result={};
for(const item of manifest){result[item.host]={};for(const device of ['desktop','mobile']){
 const name=item.host+(device==='mobile'?'.mobile':'')+'.png',file=path.join(source,name);
 if(!fs.existsSync(file)){if(device==='desktop')throw Error('Missing '+name);continue;}
 const prefix=item.slug+'-'+device,full=prefix+'.webp',cover=prefix+'-cover.webp';
 const dimensions=await sharp(file).resize({width:device==='mobile'?500:1440,height:15500,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toFile(path.join(output,full));
 await sharp(file).resize(800,560,{fit:'cover',position:'north'}).webp({quality:86}).toFile(path.join(output,cover));
 result[item.host][device]={src:'/assets/portfolio/'+cover,fullSrc:'/assets/portfolio/'+full,width:800,height:560,fullWidth:dimensions.width,fullHeight:dimensions.height,label:device==='mobile'?'Mobile website':'Desktop website',group:'Website views',device,previewType:'website',objectPosition:'50% 0%',alt:item.name+' '+device+' homepage screenshot',pageType:'homepage'};
}}
fs.writeFileSync(path.join(output,'website-screenshots.json'),JSON.stringify(result,null,2));
console.log('Prepared '+Object.values(result).reduce((sum,x)=>sum+Object.keys(x).length,0)+' real website screenshots.');
