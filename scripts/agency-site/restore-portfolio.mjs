// Run from the deployed Hub checkout with its private database environment loaded.
import { PrismaClient } from '@prisma/client';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import crypto from 'node:crypto';
process.loadEnvFile('/etc/aptech-hub/common.env');
const prisma=new PrismaClient();
try {
  const row=await prisma.landingPageContent.findUnique({where:{key:'landing.page'}});
  const saved=typeof row?.value==='string'?JSON.parse(row.value):row?.value;
  if(!Array.isArray(saved?.projects)||!saved.projects.length)throw Error('No earlier portfolio found');
  const projects=saved.projects.filter(p=>p.hidden!==true).map(p=>{
    const url=p.projectUrl||'';if(url&&!/^https?:\/\//.test(url))throw Error('Invalid project link');
    return {id:p.id,title:p.title,service:p.service||p.category||'Website Development',url,thumbnailId:'',visible:true};
  });
  const db=new DatabaseSync('/var/lib/aptech-agency/agency/agency.sqlite');
  const backup='/root/agency-before-portfolio-'+Date.now()+'.sqlite';db.exec(`VACUUM INTO '${backup}'`);fs.chmodSync(backup,0o600);
  const current=db.prepare('SELECT * FROM content WHERE id=1').get();
  const merge=text=>{const c=JSON.parse(text),existing=c.projects||[];c.projects=[...existing,...projects.filter(p=>!existing.some(old=>old.id===p.id))];return JSON.stringify(c);};
  db.exec('BEGIN IMMEDIATE');try{
    db.prepare('INSERT INTO revisions VALUES(?,?,?)').run(crypto.randomBytes(16).toString('hex'),current.published,new Date().toISOString());
    db.prepare('UPDATE content SET draft=?,published=?,version=version+1,updated=? WHERE id=1').run(merge(current.draft),merge(current.published),new Date().toISOString());db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  console.log({restored:projects.length,titles:projects.map(p=>p.title)});db.close();
}finally{await prisma.$disconnect();}
