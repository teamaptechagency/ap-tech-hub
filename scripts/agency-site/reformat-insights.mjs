// Run from the reviewed Hub release with its existing database environment.
// Draft generation and database application are deliberately separate steps.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {rewriteInsight} from '/opt/aptech-agency/agency-blog-ai.mjs';
import {INSIGHT_WRITING_INSTRUCTIONS} from '/opt/aptech-agency/insight-writing.mjs';
const require=createRequire(path.join(process.cwd(),'package.json'));
const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();
const folder=process.env.INSIGHT_REFORMAT_BACKUP;
if(!folder?.startsWith('/root/aptech-insight-format-'))throw Error('Set an explicit root-owned backup directory.');
fs.mkdirSync(folder,{recursive:true,mode:0o700});
const fingerprint=x=>crypto.createHash('sha256').update(x).digest('hex');
try{
 if(process.argv.includes('--apply')){
  const source=JSON.parse(fs.readFileSync(path.join(folder,'originals.json'),'utf8'));
  const drafts=JSON.parse(fs.readFileSync(path.join(folder,'drafts.json'),'utf8'));
  if(drafts.length!==source.length)throw Error('Not all drafts are ready.');
  await prisma.$transaction(async tx=>{
   for(const original of source){
    const live=await tx.blogPost.findUnique({where:{id:original.id},select:{content:true}});
    if(!live||fingerprint(live.content)!==fingerprint(original.content))throw Error('An article changed after the backup; no updates applied.');
    const article=drafts.find(x=>x.id===original.id)?.article;
    if(!article)throw Error('Missing draft.');
    const slug=article.category==='Guide'?'guide':'ai-insights';
    const category=await tx.blogCategory.upsert({where:{slug},create:{slug,name:article.category},update:{}});
    await tx.blogPost.update({where:{id:original.id},data:{title:article.title,excerpt:article.summary,content:article.content,categoryId:category.id,tags:article.tags,authorName:'Aptee AI',readingMinutes:Math.min(3,Math.max(2,Math.ceil(article.content.split(/\s+/).length/275)))}});
   }
   const row=await tx.setting.findUnique({where:{key:'blog.automation.aptech.v1'}});
   if(row){fs.writeFileSync(path.join(folder,'automation-setting.json'),row.value,{mode:0o600});const config=JSON.parse(row.value);config.instructions=INSIGHT_WRITING_INSTRUCTIONS;await tx.setting.update({where:{key:row.key},data:{value:JSON.stringify(config)}});}
  },{timeout:30000});
  console.log(JSON.stringify({updated:drafts.length,slugsPreserved:true,thumbnailsPreserved:true}));
 }else{
  const posts=await prisma.blogPost.findMany({where:{status:'PUBLISHED',visibility:'PUBLIC'},orderBy:{slug:'asc'}});
  const originalFile=path.join(folder,'originals.json');
  if(!fs.existsSync(originalFile))fs.writeFileSync(originalFile,JSON.stringify(posts,null,2),{mode:0o600});
  const draftFile=path.join(folder,'drafts.json');
  const drafts=fs.existsSync(draftFile)?JSON.parse(fs.readFileSync(draftFile,'utf8')):[];
  for(const post of posts){
   if(drafts.some(x=>x.id===post.id))continue;
   let article;let feedback='';
   for(let attempt=0;attempt<2;attempt++){
    try{article=await rewriteInsight({title:post.title,summary:post.excerpt,content:post.content,formatFeedback:feedback,target:'Aim for 650–700 words, with 4–6 sections before Conclusion. Meet the 500-word minimum without invented facts.'},{onDraft:draft=>fs.writeFileSync(path.join(folder,post.slug+'.latest.json'),JSON.stringify(draft,null,2),{mode:0o600})});break;}
    catch(error){feedback=String(error.message);if(attempt===1)throw error;console.log(JSON.stringify({slug:post.slug,retry:feedback}));}
   }
   drafts.push({id:post.id,slug:post.slug,article});
   fs.writeFileSync(path.join(folder,'drafts.json'),JSON.stringify(drafts,null,2),{mode:0o600});
   console.log(JSON.stringify({drafted:post.slug,words:article.content.split(/\s+/).length}));
  }
 }
}finally{await prisma.$disconnect();}
