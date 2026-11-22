import {createRequire} from 'node:module';
const require=createRequire('/opt/aptech-agency/webmail.mjs');
const {ImapFlow}=require('imapflow'),{simpleParser}=require('mailparser');
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>300000)throw Error('Input too large');}
const cfg=JSON.parse(input),senders=new Set(cfg.senders.map(s=>s.toLowerCase()));
const client=new ImapFlow({host:'imap.hostinger.com',port:993,secure:true,auth:{user:cfg.username,pass:cfg.password},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},logger:false,emitLogs:false,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
client.on('error',()=>{});
try{
 await client.connect();const lock=await client.getMailboxLock('INBOX',{readOnly:true});
 try{
  const validity=String(client.mailbox.uidValidity),same=validity===String(cfg.uidValidity),last=same?Number(cfg.lastUid):0;
  let uids=await client.search(last?{uid:(last+1)+':*'}:{all:true},{uid:true});uids=uids.filter(uid=>uid>last);uids=last?uids.slice(0,200):uids.slice(-200);
  const messages=[];let highest=last;
  const envelopes=[];if(uids.length)for await(const msg of client.fetch(uids,{uid:true,envelope:true,size:true,internalDate:true},{uid:true}))envelopes.push(msg);
  for(const msg of envelopes){
   highest=Math.max(highest,msg.uid);const from=String(msg.envelope?.from?.[0]?.address||'').toLowerCase();if(!senders.has(from))continue;
   let body='Message exceeds the preview size. Open the mailbox to read it.';
   if(msg.size<=2000000){const full=await client.fetchOne(msg.uid,{source:true},{uid:true});const parsed=await simpleParser(full.source,{skipHtmlToText:false,skipTextToHtml:true,skipImageLinks:true});body=(parsed.text||'No plain-text preview available.').slice(0,16000);}
   messages.push({uid:msg.uid,from,subject:msg.envelope?.subject||'(No subject)',messageId:msg.envelope?.messageId||'',body,date:new Date(msg.internalDate||Date.now()).toISOString()});
   if(messages.length>=40)break;
  }
  process.stdout.write(JSON.stringify({messages,lastUid:highest,uidValidity:validity}));
 }finally{lock.release();}
}finally{try{await client.logout();}catch{client.close();}}

